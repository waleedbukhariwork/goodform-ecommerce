# Goodform implementation prompt 02: delivery systems

Start DELIVERY only after FOUNDATION is verified. Read AGENTS.md, the handoff,
`docs/session-workflow.md`, `docs/tasks.json`, and the architecture. Inspect
actual code and Git status; start with `node scripts/harness/cli.mjs task start
DELIVERY`. Target two hours of the remaining budget, then hand off honestly.
Do not spend the five-hour final verification reserve.

## Outcome

Make the catalog slice reproducible in dev/staging/production and give it safe
logging, trace export, a CI path, and a reviewable release path. Use real local
runs, not configuration screenshots. Missing cloud credentials or funded service
access do not prevent independent local work; they do prevent a verified remote
claim.

## Implementation and proof

- Complete validated APP_ENV dev/staging/production runtime configuration and
  separate secrets, databases, session keys and media namespaces. Staging uses
  NODE_ENV production. Keep browser URLs relative and server origins runtime
  validated; no baked environment hostnames or secrets in client bundles.
- Integrate the pinned NestJS Observe SDK against its official API. Disable
  bodies/headers, source context and forwarded logs; redact before stdout/export.
  Disabled mode makes no exporter calls. Invalid enabled config fails startup;
  exporter outages do not fail catalog requests. Prove safe request-ID and pg
  trace behavior locally; claim hosted dashboard proof only after inspection.
- Build only web and API release images using pinned, lean multi-stage Docker
  builds, frozen installs, non-root runtime, Next standalone output and the
  compiled API migrations. Use pinned official PostgreSQL 18 and Caddy images.
  Configure correct PG18 volume mount, graceful shutdown, health checks and log
  rotation. Dev hot reload uses host apps with local infrastructure/proxy;
  deployed Compose pulls immutable images and keeps DB off public ports.
- Provide isolated staging/production Compose projects and a CI workflow that
  runs frozen install, quality checks, DB integration, browser journey and builds
  without paid services. Pin GitHub Action SHAs. Test workflow and shell syntax.
- Prepare AWS OIDC → ECR → staging smoke → authorized production promotion of
  the same image digests, plus deployment dry-run, backup, locked migration,
  readiness, HTTPS catalog smoke and rollback procedure. Do not invent role,
  DNS or host identifiers. Do not provision billable resources or claim a remote
  run if credentials/credit eligibility are unavailable.

Run real container build/smoke, environment isolation and existing root checks.
Record actual evidence in `docs/reviews/DELIVERY.json` for diff-review,
container-persistence, local-trace-safety, remote-ci and deployed-smoke. A file
or local simulation is not remote evidence. Run `verify DELIVERY`, finish only
with all criteria passed, otherwise use `implemented but unverified`. Keep
commerce and inference work available as separate tasks if remote access remains
pending. Update handoff and commit bounded changes with relevant logs.
