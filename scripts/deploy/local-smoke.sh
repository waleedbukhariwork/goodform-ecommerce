#!/usr/bin/env bash
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
repo_dir=$(cd -- "$script_dir/../.." && pwd)
tmp_dir=$(mktemp -d)
compose_file="$repo_dir/infra/compose.release.yml"
cleanup() {
  for app_env in staging production; do
    env_file="$tmp_dir/$app_env.env"
    if [[ -f $env_file ]]; then
      docker compose --env-file "$env_file" -f "$compose_file" down --volumes --remove-orphans >/dev/null 2>&1 || true
    fi
  done
  rm -rf -- "$tmp_dir"
}
trap cleanup EXIT
catalog_count() {
  local port=$1
  local response
  for attempt in $(seq 1 20); do
    if response=$(curl --fail --silent --show-error --max-time 5 "http://127.0.0.1:$port/api/v1/products" 2>/dev/null); then
      jq -r '.items | length' <<<"$response"
      return 0
    fi
    sleep 1
  done
  printf 'Catalog did not recover on port %s\n' "$port" >&2
  return 1
}
release_sha=$(git -C "$repo_dir" rev-parse HEAD)
for app_env in staging production; do
  db_password=$(openssl rand -hex 20)
  printf '%s' "$db_password" >"$tmp_dir/$app_env-password"
  printf '%s' "postgres://goodform_$app_env:$db_password@postgres/goodform_$app_env" >"$tmp_dir/$app_env-database-url"
  openssl rand -hex 32 >"$tmp_dir/$app_env-session-key"
  chmod 600 "$tmp_dir/$app_env-password" "$tmp_dir/$app_env-database-url" "$tmp_dir/$app_env-session-key"
  if [[ $app_env == staging ]]; then
    http_port=8188
    https_port=8448
  else
    http_port=8189
    https_port=8449
  fi
  cat >"$tmp_dir/$app_env.env" <<ENV
APP_ENV=$app_env
COMPOSE_PROJECT_NAME=goodform-delivery-smoke-$app_env
POSTGRES_DB=goodform_$app_env
POSTGRES_USER=goodform_$app_env
DB_PASSWORD_FILE=$tmp_dir/$app_env-password
DATABASE_URL_FILE=$tmp_dir/$app_env-database-url
SESSION_KEY_FILE=$tmp_dir/$app_env-session-key
MEDIA_NAMESPACE=$app_env-catalog
SITE_DOMAIN=:80
PUBLIC_ORIGIN=https://localhost
API_IMAGE=goodform-api:delivery
WEB_IMAGE=goodform-web:delivery
RELEASE_SHA=$release_sha
OBSERVE_ENABLED=false
EDGE_HTTP_BIND=127.0.0.1:$http_port:80
EDGE_HTTPS_BIND=127.0.0.1:$https_port:443
ENV
  compose=(docker compose --env-file "$tmp_dir/$app_env.env" -f "$compose_file")
  "${compose[@]}" config --quiet
  "${compose[@]}" up -d --wait postgres
  "${compose[@]}" run --rm --no-deps api node dist/scripts/migrate.js
  "${compose[@]}" run --rm --no-deps api node dist/scripts/seed.js --deploy
  "${compose[@]}" up -d --wait api web edge
  count=$(catalog_count "$http_port")
  [[ $count == 8 ]] || { printf '%s catalog expected 8 products, got %s\n' "$app_env" "$count" >&2; exit 1; }
  curl --fail --silent --show-error --max-time 20 "http://127.0.0.1:$http_port/" | grep -q 'Canvas Overshirt'
  printf '%s release container catalog: 8 products and home page passed\n' "$app_env"
done
stage=(docker compose --env-file "$tmp_dir/staging.env" -f "$compose_file")
"${stage[@]}" restart postgres
"${stage[@]}" up -d --wait postgres
count=$(catalog_count 8188)
[[ $count == 8 ]] || exit 1
"${stage[@]}" stop postgres
count=$(catalog_count 8189)
[[ $count == 8 ]] || exit 1
printf 'Staging database restart preserved 8 products; production remained available after staging database stopped\n'
