#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s dry-run|deploy|rollback ENV_FILE API_IMAGE WEB_IMAGE RELEASE_SHA\n' "$0" >&2
  exit 2
}
[[ $# == 5 ]] || usage
mode=$1
env_file=$2
API_IMAGE=$3
WEB_IMAGE=$4
RELEASE_SHA=$5
[[ $mode == dry-run || $mode == deploy || $mode == rollback ]] || usage
[[ -f $env_file ]] || { printf 'Environment file missing\n' >&2; exit 2; }
[[ $API_IMAGE =~ @sha256:[a-f0-9]{64}$ ]] || { printf 'API image must use a digest\n' >&2; exit 2; }
[[ $WEB_IMAGE =~ @sha256:[a-f0-9]{64}$ ]] || { printf 'Web image must use a digest\n' >&2; exit 2; }
[[ $RELEASE_SHA =~ ^[a-f0-9]{7,40}$ ]] || { printf 'Invalid release SHA\n' >&2; exit 2; }
export API_IMAGE WEB_IMAGE RELEASE_SHA
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd -- "$script_dir/../.." && pwd)
compose_file="$repo_dir/infra/compose.release.yml"
compose=(docker compose --env-file "$env_file" -f "$compose_file")
if grep -Eq '^ENABLE_STRIPE_TEST=true$' "$env_file"; then
  compose+=(-f "$repo_dir/infra/compose.stripe-test.yml")
fi
if grep -Eq '^ENABLE_MAIL=true$' "$env_file"; then
  compose+=(-f "$repo_dir/infra/compose.mail.yml")
fi
rendered=$("${compose[@]}" config --format json)
app_env=$(jq -r '.services.api.environment.APP_ENV' <<<"$rendered")
site_domain=$(jq -r '.services.edge.environment.SITE_DOMAIN' <<<"$rendered")
public_origin=$(jq -r '.services.api.environment.PUBLIC_ORIGIN' <<<"$rendered")
[[ $app_env == staging || $app_env == production ]] || { printf 'APP_ENV must be staging or production\n' >&2; exit 2; }
[[ $site_domain =~ ^[a-zA-Z0-9.-]+$ && $site_domain == *.* ]] || { printf 'SITE_DOMAIN must be a hostname\n' >&2; exit 2; }
[[ $site_domain != *.invalid ]] || { printf 'Placeholder hostname cannot be deployed\n' >&2; exit 2; }
[[ $public_origin == "https://$site_domain" ]] || { printf 'PUBLIC_ORIGIN must match SITE_DOMAIN\n' >&2; exit 2; }
"${compose[@]}" config --quiet
while IFS= read -r secret_file; do
  [[ -r $secret_file && -s $secret_file ]] || { printf 'Missing or empty release secret file\n' >&2; exit 2; }
done < <(jq -r '.secrets[].file' <<<"$rendered")
printf 'Validated %s Compose release for %s at %s\n' "$mode" "$app_env" "$site_domain"
[[ $mode == dry-run ]] && exit 0

state_dir=${RELEASE_STATE_DIR:-/var/lib/goodform/$app_env}
mkdir -p -- "$state_dir/backups"
chmod 700 "$state_dir" "$state_dir/backups"
exec 9>"$state_dir/deploy.lock"
flock -n 9 || { printf 'Another release is active\n' >&2; exit 1; }

smoke() {
  curl --fail --silent --show-error --max-time 20 "https://$site_domain/api/v1/products" |
    jq -e '.items | type == "array"' >/dev/null
  curl --fail --silent --show-error --max-time 20 "https://$site_domain/" >/dev/null
}

if [[ $mode == rollback ]]; then
  target="$state_dir/previous.json"
  [[ ! -f $state_dir/attempted.json ]] || target="$state_dir/current.json"
  [[ -f $target ]] || { printf 'No stable image pair recorded\n' >&2; exit 1; }
  API_IMAGE=$(jq -r '.api' "$target")
  WEB_IMAGE=$(jq -r '.web' "$target")
  RELEASE_SHA=$(jq -r '.sha' "$target")
  export API_IMAGE WEB_IMAGE RELEASE_SHA
  "${compose[@]}" up -d --wait api web edge
  smoke
  if [[ $target != "$state_dir/current.json" ]]; then
    cp "$target" "$state_dir/current.json"
  fi
  rm -f "$state_dir/attempted.json"
  printf 'Rolled back images. Database migrations are not reversed.\n'
  exit 0
fi

"${compose[@]}" up -d --wait postgres
backup="$state_dir/backups/$(date -u +%Y%m%dT%H%M%SZ)-$RELEASE_SHA.sql.gz"
"${compose[@]}" exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -c >"$backup.partial"
chmod 600 "$backup.partial"
mv "$backup.partial" "$backup"
jq -n --arg api "$API_IMAGE" --arg web "$WEB_IMAGE" --arg sha "$RELEASE_SHA" \
  '{api: $api, web: $web, sha: $sha}' >"$state_dir/attempted.json"
printf 'Database backup created at %s\n' "$backup"
"${compose[@]}" run --rm --no-deps api node dist/scripts/migrate.js
"${compose[@]}" run --rm --no-deps api node dist/scripts/seed.js --deploy
"${compose[@]}" up -d --wait api web edge
smoke
if [[ -f $state_dir/current.json ]]; then
  cp "$state_dir/current.json" "$state_dir/previous.json"
fi
jq -n --arg api "$API_IMAGE" --arg web "$WEB_IMAGE" --arg sha "$RELEASE_SHA" \
  '{api: $api, web: $web, sha: $sha}' >"$state_dir/current.json.tmp"
chmod 600 "$state_dir/current.json.tmp"
mv "$state_dir/current.json.tmp" "$state_dir/current.json"
rm -f "$state_dir/attempted.json"
printf 'HTTPS catalog smoke passed for %s at %s\n' "$RELEASE_SHA" "$site_domain"
