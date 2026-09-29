# Goodform implementation prompt 01: catalog foundation

Use this prompt in a fresh Codex or Command Code session after reading
`docs/session-workflow.md`. Target three hours of the remaining assignment budget.
Stop with an honest handoff at that limit; do not borrow from the five-hour final
verification reserve. The full product and release standards are in
`docs/scope.md` and `docs/architecture.md`.

## Outcome

A real, locally verified Next.js → NestJS → PostgreSQL catalog slice. A visitor
can browse/search eight seeded demonstration garments, inspect details and size
charts, and see useful loading, empty and error states on mobile and desktop.
The frontend and backend share a generated API contract. No accounts, checkout,
image generation or cloud release in this task.

## First actions

Read AGENTS.md, the handoff, task tracker, architecture and this prompt. Inspect
Git status. Run `node scripts/harness/cli.mjs doctor`, then
`node scripts/harness/cli.mjs task start FOUNDATION`. Confirm Codex or Command Code
capture is active for this tool; do not rebuild a verified capture mechanism.
Preserve unrelated changes and historical logs. No co-author commit lines.

## Implementation

- Create a pnpm workspace with Node 24, strict TypeScript, `apps/web`, `apps/api`,
  `packages/api-contracts`, and shared tooling only where used. Pin compatible
  versions and one lockfile. Verify ESM Nest boot and decorator validation with
  an actual HTTP request. No Prisma, Zod, Axios, empty modules or new build
  orchestrator.
- Use Nest presentation/application/infrastructure boundaries for catalog.
  Drizzle + PostgreSQL migrations enforce unique slugs and nonnegative integer
  prices. Seed eight deterministic upper-body garments with size charts. Use
  permitted, documented, versioned imagery; label demonstration measurements.
  Migration replay and seed reruns must be safe in a disposable local database.
- Implement validated bounded GET `/api/v1/products?q=&page=&pageSize=`,
  GET `/api/v1/products/:slug` with real 404, and live/ready health endpoints.
  Reject unknown DTO fields using Nest ValidationPipe, class-validator and
  class-transformer. Ready depends on DB; live does not.
- Export OpenAPI without needing a DB secret. Generate frontend contract types
  and make contract drift a failing check. Return safe problem+json errors and
  request IDs. Log structured, redacted JSON without raw input or secrets.
- Use native fetch: browser paths are relative `/api/*`; server code uses a
  validated, server-only `INTERNAL_API_ORIGIN`. Handle non-2xx, non-JSON, 204,
  timeout, abort and network failure. Do not retry mutations. Keep internal URLs
  and secrets out of browser output. Give the catalog and detail pages usable
  loading, empty, unavailable and retry states with keyboard access.
- Use current-content ETags and mandatory revalidation for public catalog HTTP
  responses. Next server reads use no-store. Verify changed product content
  changes the ETag. Document minimal dev/staging/production config placeholders
  and validation; full environment isolation and release wiring belong to
  DELIVERY. Do not claim cloud or Observe dashboard coverage in FOUNDATION.

## Checks and finish

Provide real root scripts: `format:check`, `lint`, `typecheck`, `contracts:check`,
`test`, `test:integration`, `test:e2e`, `build`, `db:migrate`, `db:seed`, `dev`.
The harness requires every configured application check to execute; no echo
stubs or empty passing suites. Test real PostgreSQL list/detail/DTO errors,
migration+seed reruns, DB outage readiness, safe error/log output, changed ETags,
and one browser catalog→detail journey at mobile and desktop sizes.

Create `docs/reviews/FOUNDATION.json` with actual evidence for the tracker’s
manual criteria: diff-review, browser-catalog and local-db-persistence. Run
`node scripts/harness/cli.mjs verify FOUNDATION`; finish only if it passes and
source is unchanged. If browser/Postgres access blocks proof, record
`implemented but unverified` and the exact next action. Update handoff with
commands/results and next task, then commit bounded code with associated logs.
