# Catalog delivery operations

## Environments and local work

`APP_ENV` is `dev`, `staging`, or `production`. Staging and production require
`NODE_ENV=production`, a matching database name and media namespace, and a session
key file of at least 32 characters. Session and media features are not implemented
in the catalog slice; these values reserve separate credentials and namespaces for
later tasks. The API reads `DATABASE_URL_FILE` at startup (or `DATABASE_URL` for
local work), and rejects both being set. Use a distinct database URL, password,
key file, media namespace and Compose project for each environment. Do not put
secrets in environment examples or Git. The browser uses relative `/api` routes;
Next gets `INTERNAL_API_ORIGIN` only at server runtime. A release image needs no
environment hostname at build time.

For host hot reload, run the official PostgreSQL 18 service in
`infra/compose.dev.yml` with `DEV_DB_PASSWORD_FILE` pointing to a local password
file, then run `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`, and
`node infra/dev-proxy.mjs` on the host. The development database is exposed only
on loopback. The proxy also binds to loopback. `docs/local-development.md` covers
the catalog commands.

## Local release proof

The only custom release images are `apps/api/Dockerfile` and
`apps/web/Dockerfile`. Both use a pinned Node 24 Debian slim digest, frozen
workspace installs and an unprivileged runtime. The API carries compiled Drizzle
migrations; the web image uses Next standalone output. Compose uses pinned
PostgreSQL 18 and Caddy digests. PostgreSQL 18 stores data under
`/var/lib/postgresql`, so the named volume mounts that parent directory. Services
have readiness checks, graceful stop periods and rotated Docker logs. The
deployed database has no host port. Caddy handles HTTPS automatically when
`SITE_DOMAIN` is a real hostname with DNS pointing to the host.

Use disposable local secrets and `infra/compose.release.yml` for a container
smoke. Bind Caddy to loopback, set `SITE_DOMAIN=:80`, and use the local image tags.
Run the compiled migration and insert-only `seed.js --deploy` in one-shot API containers before starting
all services. The committed `scripts/deploy/local-smoke.sh` repeats this for
staging and production and checks catalog persistence and environment separation.
Its HTTP loopback result is local evidence only.

## Observe

The API enables `@nestjs/observe@0.3.3` only with
`OBSERVE_ENABLED=true` and complete app key, app secret and service ID. Invalid
enabled configuration fails startup. The default is disabled and makes no
exporter call. Instrumentation disables source context, HTTP request capture,
forwarded logs and runtime metrics, obfuscates query parameters, and redacts
common secrets. Only allowlisted structured fields reach stdout. PostgreSQL
spans remain enabled. Sampling defaults to 5 percent, batches to 25 spans and
flushes every two seconds. The local collector integration test verifies request
IDs, a PostgreSQL span, absence of the query and fixture credentials, disabled
mode, and catalog responses during collector 503s. Hosted dashboards and free
tier accounting require a real account and review before enabling production
export. Do not supply Observe credentials through committed files.

## Remote release prerequisites and procedure

The GitHub application workflow runs frozen install, quality, database,
Chrome browser and build checks using local PostgreSQL and no paid service.
The manual release workflow uses AWS OIDC to publish immutable ECR digests. It
then deploys and smokes staging. Production runs only when the dispatch input is
true, staging succeeded, and the `production` GitHub environment grants approval.
Configure required reviewers for that environment before enabling release.

Provision two isolated hosts or equivalent environments with Docker Compose,
`jq`, `flock`, `curl`, `gzip`, AWS CLI, DNS and HTTPS reachability. Configure
`AWS_PUBLISH_ROLE_ARN`, `AWS_REGION`, `API_ECR_REPOSITORY` and
`WEB_ECR_REPOSITORY` as GitHub repository variables. In each protected GitHub
environment set `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_ROOT`, `DEPLOY_ENV_FILE`,
`AWS_REGION`, and secrets `DEPLOY_SSH_PRIVATE_KEY` and `DEPLOY_KNOWN_HOSTS`.
The host must have an ECR read role and a private environment file modeled on
`infra/release.env.example`, plus separate secret files. Review OIDC trust,
ECR permissions, host fingerprints, branch protection, DNS and GitHub environment
approval before the first remote run. No role ARN, host, domain, or cloud resource
is assumed here.

`bash scripts/deploy/release.sh dry-run ENV_FILE API_DIGEST WEB_DIGEST SHA`
validates Compose and environment values without changing containers.
`deploy` takes the same arguments, locks releases with `flock`, starts the
isolated database, writes a restricted `pg_dump` backup, runs the compiled
migration and insert-only catalog seed, waits for ready services, and checks the HTTPS catalog and home
page. It records the image pair only after smoke passes. If smoke fails, inspect
service logs and run `rollback` with the same arguments; rollback restores the
last stable image pair and repeats smoke. It does not reverse database migrations.
A database restore is an operator decision after stopping writes and checking
schema compatibility. Backups need off-host retention and a restore rehearsal
before production can be called verified.

A workflow file or local simulation is not proof of remote CI or deployment.
Record the actual run URLs, digest pair, dashboard observation and HTTPS smoke
results in the DELIVERY review after credentials and resources are available.
