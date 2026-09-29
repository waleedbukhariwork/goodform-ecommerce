#!/usr/bin/env bash
set -euo pipefail
[[ $# == 5 ]] || { printf 'Usage: ssh-release.sh MODE API_IMAGE WEB_IMAGE RELEASE_SHA AWS_REGION\n' >&2; exit 2; }
mode=$1
api_image=$2
web_image=$3
release_sha=$4
aws_region=$5
[[ $mode == dry-run || $mode == deploy ]] || exit 2
: "${DEPLOY_HOST:?}" "${DEPLOY_USER:?}" "${DEPLOY_ROOT:?}" "${DEPLOY_ENV_FILE:?}" "${DEPLOY_SSH_PRIVATE_KEY:?}" "${DEPLOY_KNOWN_HOSTS:?}"
[[ $DEPLOY_HOST =~ ^[a-zA-Z0-9.-]+$ && $DEPLOY_USER =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 2
[[ $DEPLOY_ROOT =~ ^/[a-zA-Z0-9/_-]+$ && $DEPLOY_ENV_FILE =~ ^/[a-zA-Z0-9/_.-]+$ ]] || exit 2
[[ $aws_region =~ ^[a-z]{2}-[a-z]+-[0-9]$ ]] || exit 2
[[ $api_image =~ ^[a-zA-Z0-9./_-]+@sha256:[a-f0-9]{64}$ && $web_image =~ ^[a-zA-Z0-9./_-]+@sha256:[a-f0-9]{64}$ ]] || exit 2
registry=${api_image%%/*}
key_file=$(mktemp)
known_hosts=$(mktemp)
trap 'rm -f "$key_file" "$known_hosts"' EXIT
chmod 600 "$key_file" "$known_hosts"
printf '%s\n' "$DEPLOY_SSH_PRIVATE_KEY" >"$key_file"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" >"$known_hosts"
ssh_opts=(-i "$key_file" -o "UserKnownHostsFile=$known_hosts" -o StrictHostKeyChecking=yes -o BatchMode=yes)
remote="$DEPLOY_USER@$DEPLOY_HOST"
ssh "${ssh_opts[@]}" "$remote" "mkdir -p '$DEPLOY_ROOT/infra' '$DEPLOY_ROOT/scripts/deploy'"
scp "${ssh_opts[@]}" infra/compose.release.yml infra/compose.stripe-test.yml infra/Caddyfile "$remote:$DEPLOY_ROOT/infra/"
scp "${ssh_opts[@]}" scripts/deploy/release.sh "$remote:$DEPLOY_ROOT/scripts/deploy/"
ssh "${ssh_opts[@]}" "$remote" "bash '$DEPLOY_ROOT/scripts/deploy/release.sh' dry-run '$DEPLOY_ENV_FILE' '$api_image' '$web_image' '$release_sha'"
if [[ $mode == deploy ]]; then
  ssh "${ssh_opts[@]}" "$remote" "aws ecr get-login-password --region '$aws_region' | docker login --username AWS --password-stdin '$registry' >/dev/null"
  ssh "${ssh_opts[@]}" "$remote" "bash '$DEPLOY_ROOT/scripts/deploy/release.sh' deploy '$DEPLOY_ENV_FILE' '$api_image' '$web_image' '$release_sha'"
fi
