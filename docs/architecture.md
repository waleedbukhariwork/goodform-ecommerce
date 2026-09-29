# Goodform engineering architecture

Status: implementation specification, not a claim that the application exists or has passed verification.

## Decisions and scope

The product remains an eight-garment fashion storefront with accounts, a private photo-based fitting room, measurement comparison, and Stripe test checkout. The user requested this stack revision: a separate NestJS backend, Drizzle instead of Prisma, DTO validation instead of application Zod schemas, native fetch instead of Axios, and NestJS Observe. These decisions supersede the earlier Next.js-only backend plan.

Use a modular monolith, with a Next.js frontend and a separately running Nest API. The eventual worker uses the backend code and image with a different entry point. This is not a microservices architecture. Target a three-hour foundation milestone; retain the overall 20-hour deadline and five-hour final verification reserve. Report a foundation overrun rather than silently consuming the verification reserve.

AWS hosts the application and database. Google credits cover eligible try-on API usage; Stripe remains in test mode even in the production deployment. NestJS Observe is an explicitly requested additional telemetry service; configure its free tier only. Resend is the approved transactional mail provider for email verification and password reset, used in production only, within its free allowance; verify its account, sending-domain verification and current limits before enabling it. Verify Observe's account availability, current limits, and privacy configuration before export. No uncovered cloud spending or paid subscriptions are authorized.

### Verified version snapshot

Public npm registry metadata read on 2026-09-29 returned the following stable `latest` versions. Registry and peer metadata checks are not installation, compilation, security, or integration tests.

| Package | Version |
| --- | --- |
| next | 16.3.6 |
| react | 19.3.0 |
| @nestjs/core, @nestjs/common | 12.1.1 |
| @nestjs/observe | 0.3.3 |
| drizzle-orm | 0.45.3 |
| drizzle-kit | 0.31.11 |
| class-validator | 0.15.1 |
| class-transformer | 0.5.1 |
| better-auth | 1.7.6 |
| resend | 6.30.0 |
| pnpm | 12.6.0 |

Use Node 24 LTS; the locally observed version is 24.19.0. Use PostgreSQL 18 with a pinned supported patch image, not PostgreSQL 19 beta. Resolve remaining package versions from official metadata, including Nest platform/config/Swagger packages and the Better Auth Drizzle adapter. Select a mutually supported TypeScript/compiler/linter combination; do not adopt a compiler major solely because it has a newer number. Record any departure from the snapshot with compatibility or security evidence. Pin exact direct dependencies, the package manager, lockfile, and released image digests. Never use `--force` or ignore peer conflicts to make installation pass.

Nest owns ValidationPipe, but class-validator and class-transformer are separate dependencies. No direct Prisma, Zod, Axios, or @nestjs/axios usage. Legitimate transitive dependencies inside an approved library are not a reason to replace it or fork its internals.

## Repository and boundaries

```text
apps/
  web/                      Next.js frontend
  api/                      Nest HTTP application; later worker entry point
packages/
  api-contracts/            generated OpenAPI types; no backend runtime imports
  tooling/                  shared lint and TypeScript configuration
infra/                      Docker, Compose, proxy, deployment scripts
docs/                       architecture, scope, task evidence, short runbooks
```

Use pnpm workspaces and ordinary scripts. Do not introduce Nx or Turborepo for two applications. Preserve existing agent capture files, rules, and historical logs.

Each implemented Nest feature follows:

```text
modules/<feature>/
  presentation/             controllers, DTOs, HTTP response mapping
  application/              use cases, orchestration, required ports
  domain/                   business rules and domain errors, when needed
  infrastructure/           Drizzle repositories and external adapters
  <feature>.module.ts       composition and dependency injection
  index.ts                  deliberate cross-module exports
```

Create folders and abstractions when there is real behavior to place in them. A read-only catalog need not invent entities, aggregates, factories, or domain services. Controllers delegate; repositories query and persist; domain code has no HTTP, Nest, database-driver, or provider SDK imports. Interfaces belong at actual persistence/external-service boundaries, not in front of every class. Use constructor injection and explicit response mapping; do not expose database rows as public API types.

Module ownership for later slices: identity owns users/sessions, transactional mail delivery and the mail send throttle; catalog owns descriptions, prices and size charts; inventory owns stock/reservations; carts owns selections; orders owns purchase snapshots/status; payments owns Stripe integration and processed events; fitting-room owns photos, jobs and generation budgets. Application use cases orchestrate exported module capabilities. Never import another module's repository or write its tables directly. Reject circular dependencies instead of normalizing `forwardRef()`.

Cross-module transactions are required for checkout/order/inventory consistency. Introduce a transaction runner and backend-only transaction context when that slice exists; participating capabilities use the same transaction. Do not build a generic transaction framework during catalog scaffolding. Database jobs provide durable asynchronous work; events in process are not reliable delivery. No Kafka, CQRS framework, event sourcing, Redis, or distributed locks until a demonstrated requirement warrants them.

Frontend routes compose feature components. Each feature owns its API calls, view models, components, and relevant hooks. Shared UI contains reusable presentation only. Business rules and permissions stay in Nest. Server Components handle initial reads; Client Components handle interaction. Avoid global state for server-owned data. Use URL state for catalog filters and local state for temporary UI interactions.

Enforce these boundaries with ESLint restricted imports: frontend cannot import backend/database packages; domain cannot import infrastructure; another feature cannot import private feature internals. Avoid catch-all `common` or `utils` directories.

## HTTP contracts and environment configuration

Nest serves application endpoints under `/api/v1`. Better Auth owns `/api/auth`. Caddy routes `/api/*` to Nest and all other public paths to Next without stripping prefixes. Next has no duplicate domain API or generic pass-through proxy.

Browser requests use a shared native-fetch transport and relative URLs. A fixed API route prefix is a protocol contract, not an environment-specific hostname. Next server requests use the server-only runtime `INTERNAL_API_ORIGIN`; the transport joins this origin to approved relative paths. Validate the origin at startup. Do not construct destination URLs from user input or an untrusted Host header. Forward only the current request's required session headers and correlation context to that trusted origin, never a globally cached user's credentials.

Use `APP_ENV=dev|staging|production`; retain the framework's `NODE_ENV=development|production`. Staging uses NODE_ENV=production. Browser URLs and runtime configuration must not depend on environment-specific NEXT_PUBLIC variables: Next inlines those at build time. For the few nonsecret browser settings, pass an explicit runtime allowlist from the server. Nothing in the browser receives database, internal-network, telemetry, Stripe secret, or Google credentials.

Nest uses typed ConfigModule namespaces with startup validation using class-validator/class-transformer and explicit parsing. Disable implicit conversions; parse booleans explicitly so the string "false" is not true. Web server configuration is validated separately without importing Nest into the frontend. Read process.env only in configuration modules, bootstrap/CLI boundaries, and framework configuration. Enable integration-specific secret validation only when that integration is enabled. Fail fast on missing required configuration without printing values.

Maintain placeholder-only dev/staging/production templates and one documented configuration precedence: explicitly selected local env file for development; injected runtime environment for deployments. Never load a production secret file as a development fallback. Bind local infrastructure to loopback. Keep staging and production secrets, session keys, DB users/databases, media paths, budgets, and telemetry identifiers distinct.

Global ValidationPipe: transform DTO instances, whitelist fields, reject non-whitelisted input, suppress target/value echoing in errors, and explicitly validate nested DTOs, bounds, UUIDs and query conversions. The auth library retains its own validated protocol handler; it does not need redundant DTO wrappers. Export OpenAPI from a credential-free metadata bootstrap, generate frontend types with openapi-typescript, and check generated-contract drift in CI. Generated types do not constitute runtime validation. The API validates inputs and emits explicit response DTOs; provider responses are checked at adapter boundaries.

Use RFC 9457-style `application/problem+json` for application errors: type, title, status, safe detail, pathname-only instance, stable code, requestId, and optional fieldErrors. Preserve meaningful 400/401/403/404/409/429/503 responses. Unknown errors become a safe 500 response; log details once server-side. Do not rewrite Better Auth or Stripe protocol responses into an incompatible envelope.

The fetch transport handles non-2xx status, problem responses, non-JSON failures, 204, timeout, AbortSignal, and cancellation. Do not blindly set JSON content type for uploads. No automatic mutation, checkout, or generation retries. Add retries only for explicitly safe read operations with bounded backoff. The frontend displays useful messages and a support request ID, not stack traces or raw provider errors.

## Identity and commerce contracts

Keep Better Auth with its Drizzle PostgreSQL adapter in Nest. Use the official Node handler on the Express adapter rather than an additional Nest integration wrapper. Mount it before JSON parsing; use ESM-compatible backend compilation. Handle raw Stripe webhook bytes before JSON parsing as a separate route. Test parser order rather than copying a bootstrap snippet blindly.

Use host-only HttpOnly cookies, Secure over deployed HTTPS, SameSite=Lax, explicit trusted origins, server sessions and logout invalidation. Guard private application routes by default with explicit public catalog/health routes. Mutation origin/CSRF protections must cover Nest routes, not only the auth handler. Signed Stripe webhooks are exempt from browser-origin checks, not from signature validation. Do not share parent-domain session cookies between staging and production. No browser localStorage tokens or handwritten password/session cryptography.

Future commerce slices retain server-authoritative integer-cent totals, immutable order-line snapshots, atomic reservations, checkout idempotency, verified Stripe events, webhook deduplication and reconciliation. A redirect never establishes payment success. No live Stripe keys in any submission environment. Rate limits protecting login and billable generation must use shared atomic storage; process-local counters are not sufficient across API processes.

## Caching policy

| Data | Policy and ownership |
| --- | --- |
| Hashed JS/CSS and versioned public product images | Long-lived immutable browser caching; asset URL changes on content change |
| Public catalog HTTP responses | ETag plus `public, max-age=0, must-revalidate`; conditional requests use current DB content, no public response may set a session cookie |
| Next server catalog reads initially | Explicit no-store; eight products do not justify another data cache |
| Sessions, carts, orders, checkout quotes, private media/job endpoints | `private, no-store`; no cross-user or public proxy caching |
| Try-on result reuse | Owner-scoped application reuse keyed by source revision, product revision and model settings, only before expiry/deletion |
| Stock and prices at checkout | Read and validate authoritative transactional data regardless of previous browser display |

Do not add Redis to satisfy a checklist. Do not globally cache authenticated fetches or apply a blanket Nest cache interceptor. Caddy has no application cache in this design. If measured load later justifies metadata caching, add a bounded cache with explicit keys, TTL, post-commit invalidation and observed hit rate; retain uncached checkout validation. Multi-instance Next ISR/caching requires shared invalidation and is not established by running this single-host deployment.

## Logging, errors, and tracing

Use Nest's structured JSON ConsoleLogger with a consistent context containing UTC timestamp, severity, service, environment, release SHA, requestId and, when active, Observe traceId. Use AsyncLocalStorage for request context. Generate bounded server-side correlation IDs and return X-Request-Id; IDs do not authorize access. Web server logs use the same field names. Apply safe-field allowlisting and central redaction before stdout, including exception messages/stacks, even when Observe is disabled; ConsoleLogger alone is not a secret scrubber. Bound stdout retention through Docker log rotation.

Use one NestJS Observe instrumentation installation per API/worker process. Its documented SDK supports Nest lifecycle, pg driver queries and native fetch. Use its documented integration and configure exact options against the pinned version; do not invent APIs. Disable request-body/header capture, source-code context export and log forwarding; keep default redaction enabled. Allowlist safe tags (environment, release, module, outcome). Do not collect customer photos, addresses, emails, raw URL queries, credentials, signed image links, SQL parameters or payment payloads. Restrict outbound correlation propagation to owned services.

Transactional mail holds customer email addresses at delivery time, so the existing rule against collecting them applies literally. Pass an address to the provider only to deliver the requested message. Never log an address, never place one in a URL query, a trace, an error body or a structured log field, and never record one in the database: the send throttle stores a keyed salted hash with a fixed per-purpose time window instead. Hash salt is read from configuration so a restart cannot invalidate existing throttles. Do not record subject, body or token material. Auth responses carrying a cooldown or verification state are private and must not be cached.

Observe can be disabled locally; disabled means no SDK exporter network activity. Enabling it requires valid configuration. Exporter failure must not fail a business request or grow an unbounded queue. Verify current free-plan caps and enforce the available SDK limits. Keep structured local logging available regardless of the dashboard. Log forwarding is not required and may need a paid Observe plan. Do not add a parallel OpenTelemetry collector/Grafana/Prometheus deployment.

Observe coverage is the Nest backend and later workers. Browser/server-to-API correlation must be implemented, but automatic Next/browser distributed tracing is not claimed. For database-backed jobs, persist safe correlation context and explicitly instrument worker execution; BullMQ-specific automatic tracing does not instrument an unrelated PostgreSQL job runner.

Capture an actual HTTP-to-use-case-to-pg trace and a controlled failure with a matching safe client request ID before claiming remote tracing is verified. Trace dependency timing and job states without user data. Local capture tests can prove redaction/export payload shape; they do not prove a live dashboard connection.

## Containers, environments, and release workflow

Maintain exactly two custom release images: web and api. The later worker and the one-shot migration command reuse the API image. PostgreSQL and Caddy use pinned official images. Dev runs web/API hot reload on the host and uses containers for infrastructure; a lightweight local proxy provides the same /api routing as deployments. No container rebuild for each edit.

Use multi-stage Dockerfiles, a Debian slim Node base, frozen pnpm installs, BuildKit dependency cache mounts, non-root application users, and Next standalone output. Compile backend output and package only required production dependencies, migrations and artifacts. Do not ship the repository or dev dependencies in runtime images. Do not embed secrets in ARG/ENV build layers. .dockerignore excludes local secrets, personal media, node_modules, .git, tests and agent logs from the build context; this does not gitignore, change or delete agent logs. Keep committed migration files and required workspace sources in build contexts.

Pin base-image digests and CI actions to verified commits. Do not fabricate digests. Build only the EC2 target architecture. Add exec-form entrypoints, graceful SIGTERM handling, writable tmpfs/cache/media paths where required, bounded resources, and health checks. Test actual native dependencies and startup; blindly adding --ignore-scripts can break their installation. Do not modify the PostgreSQL image user/entrypoint without validating its documented initialization. PostgreSQL 18's official image uses a versioned PGDATA layout and expects persistence at /var/lib/postgresql; verify the selected image and demonstrate restart persistence.

Liveness measures process health, not Google/Stripe availability. API readiness checks DB connectivity and required migration state with a short timeout. Frontend readiness checks its own server; the deployed smoke check exercises the API and DB. Drain HTTP traffic and close DB pools on shutdown. Worker stop behavior must avoid duplicate provider submissions.

Development, staging, and production use separate Compose project names, databases/users, volumes, secrets and hostnames. For the credit-limited assignment, staging can run on demand on the same EC2 host with logical isolation and explicit resource limits. Record shared-host failure/capacity risk; this is not high availability or a strong hostile-tenant security boundary. Use a separate host/account when budget and operational requirements justify it, without changing application code. Use a single edge proxy for the existing production/staging hostnames. Do not provision extra hosts without confirmed credit coverage.

PR CI performs frozen install, formatting, lint/boundary checks, types, generated-contract drift check, unit tests, PostgreSQL integration tests, critical browser tests and production builds. No paid API calls in CI. Fork PRs receive no deployment secrets. Run checks with least privilege; never use pull_request_target to execute untrusted contribution code with credentials. Triage dependency/container scan findings without treating an audit as proof of security.

After a passing main commit, build the two release images once, publish to ECR and record their content digests in a release manifest. Test the published images in staging and promote those same digests to production. Do not rebuild images to change environments or rebuild application output separately inside and outside the release build just to repeat a green check. PR builds and a merged release may be separate commits; never reuse artifacts without verifying their commit identity. Use path-aware image selection with a full-build fallback for lockfile/shared-tooling changes, and reuse unchanged image digests only from a verified release manifest.

Use GitHub Actions OIDC with environment-scoped AWS roles instead of long-lived AWS keys. Protect production with the repository's available environment controls; where required reviewers are unavailable, use an explicitly authorized manual promotion workflow. Serialize deployments per environment and hold a host-side deployment lock. Parameterize region, instance IDs, ECR repositories and hostname mappings. Use AWS SSM for commands and Standard SecureString parameters for runtime secrets under separate staging/production prefixes; never log decrypted values or shell command substitutions containing secrets. Google credentials remain server-side; prefer supported workload identity, or explicitly document and tightly scope a mounted credential if required by the verified account setup.

Deployment order: validate configuration and capacity; retrieve images by digest; back up DB and verify the backup artifact; run one locked forward migration using the candidate API image; update services without taking down DB volumes; wait for readiness; perform HTTPS/catalog/login smoke checks; record release evidence. Use backward-compatible expand migrations. On failed rollout, restore prior application image digests only if schema-compatible; do not automatically run down migrations or restore a database and discard newer writes. Document a maintenance-window database recovery procedure. This initial Compose strategy allows a brief interruption and must not be marketed as zero downtime.

Keep the previous verified images and release manifest. Do not use docker system prune or docker compose down -v in deploy scripts. Verify an actual backup restore into an isolated database before claiming restore readiness; at least one encrypted backup must be off-host for machine-loss recovery. An encrypted private S3 backup location is allowed only within verified AWS credit coverage, with separate prefixes, bounded retention and no personal fitting-room media. Never reset/seed production automatically at startup. Seed demo data explicitly with an environment guard.

## Definition of done and sources

Implementation must demonstrate behavior, not just create folders/configuration. Record commands and results, diff review, resolved versions/image digests, CI status, deployment smoke evidence, and external checks not run. Keep known single-host, demo payment, model-quality and provider-retention limitations visible. Useful comments explain a non-obvious invariant or decision. No AI narration, decorative banners, unsupported scale claims, fake completion comments, dead code or speculative abstractions.

Primary sources consulted:

- [Nest validation](https://docs.nestjs.com/techniques/validation)
- [Nest Observe SDK](https://docs.nestjs.com/observability/sdk) and [source repository](https://github.com/nestjs/observe)
- [Nest JSON logging](https://docs.nestjs.com/techniques/logger)
- [Drizzle migration workflow](https://orm.drizzle.team/docs/migrations)
- [Better Auth Express integration](https://better-auth.com/docs/integrations/express) and [Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Next environment variables](https://nextjs.org/docs/app/guides/environment-variables) and [self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Docker build practices](https://docs.docker.com/build/building/best-practices/) and [official PostgreSQL image documentation](https://github.com/docker-library/docs/blob/master/postgres/README.md)
- [GitHub AWS OIDC](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
