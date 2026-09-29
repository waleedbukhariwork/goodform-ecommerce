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
smoke. Bind Caddy to loopback, set `SITE_DOMAIN=:80` and `PUBLIC_ORIGIN=https://localhost` for the disposable smoke, and use the local image tags. A remote release requires `PUBLIC_ORIGIN` to match its HTTPS site hostname.
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

## Commerce release extension

The API middleware order is request-ID correlation, Better Auth and signed Stripe raw routes, browser mutation Origin check, default-deny session guard, bounded JSON parser, then Nest routes. Raw routes must precede the parser because Better Auth consumes its own body and Stripe verifies an exact byte sequence. Public catalog and health reads are the only anonymous Nest allowlist; new application routes are private by default. The API uses a configured public origin, never a request Host header, for trust and Stripe return URLs.

Checkout uses an explicit PostgreSQL transaction handle across cart/catalog reads, reservation consumption, and order snapshot insertion. Stripe session creation happens after commit because an external API cannot roll back with PostgreSQL. The attempt row reserves the client key with a unique constraint before that call; uncertain calls are not retried automatically. Webhooks verify raw signatures, reject live-mode events, deduplicate event IDs with a primary key, retrieve current Stripe state, and apply order transitions transactionally. The owner-only reconciliation route can recover a missed webhook once the provider session ID is stored. An attempt without a stored provider session ID needs operator review of Stripe test-mode records before any stock or order correction. See `docs/commerce.md` for the exact operation and observed boundary.

The optional `infra/compose.stripe-test.yml` overlay mounts separate Stripe test key and webhook secret files only when the private release environment sets `ENABLE_STRIPE_TEST=true`. The base Compose release remains startable without Stripe credentials and returns a safe 503 for checkout. No remote Stripe account, webhook delivery, or HTTPS payment journey has been verified in this checkout.

## Current AWS staging release

The user-owned `goodform.waleedbukhari.com` A record points to the dedicated staging EC2 elastic IP `3.108.229.151` in `ap-south-1`. The instance is `i-01e4b1cbb723f3cfd`; it is managed through AWS Systems Manager with no SSH port. Its security group accepts TCP 80 and 443 only. HTTP redirects to HTTPS; Caddy manages the trusted certificate.

The current staging release is source commit `1aece69` with immutable ECR manifest digests `sha256:b4876d90c728edbfc1cc6a68c6377d1388dc278317580ce9514299c122dd823c` for API and `sha256:c94f3915e93729bce3321960772669ac28818690a85a95e693d83efd5e204fe3` for web. The previous staging release was `8ae4e2e6399b` (API `sha256:08c9fbcf35d54c102d386ddff03a2c9acefe636f2d0b555ef42ee29d74070e29`, web `sha256:d7752349ea3387a0679c085b65a9100101a4d66a81371ff5ae5a71e11aa438bf`). Host files live under `/opt/goodform`; `/opt/goodform/staging.env` and `/opt/goodform/secrets/staging` are private. The current image pair is recorded at `/var/lib/goodform/staging/current.json`. Never print host secret-file contents.

For an operator check, use `aws ssm send-command` with `AWS-RunShellScript` against that instance to run a short script that inspects `docker compose --env-file /opt/goodform/staging.env -f /opt/goodform/infra/compose.release.yml ps` and the release state. Public smoke: `curl -I http://goodform.waleedbukhari.com/` must redirect to HTTPS; `curl -fI https://goodform.waleedbukhari.com/` must verify TLS and show HSTS; `curl -f https://goodform.waleedbukhari.com/api/v1/products` must return eight seeded products. Anonymous cart access should return 401.

The host uses a dedicated EC2 role for SSM and ECR pulls. ECR basic scans of the deployed runtime images showed zero critical, two high and one low OS finding per image on 2026-09-29; this does not assess npm packages. The current high findings were in zlib and Perl. Off-host backup retention and a restore rehearsal remain open. Stripe TEST credentials and hosted Observe are not configured; checkout and tracing must not be presented as verified. The GitHub Actions release workflow still requires repository connection and credentials and has no observed remote run.
