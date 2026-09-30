# Goodform

Goodform is a small demonstration clothing store: eight fictional garments, accounts, a private cart, and Stripe test checkout. The approved product also includes a private photo fitting room. That fitting room is not built.

The public site [https://goodform.waleedbukhari.com](https://goodform.waleedbukhari.com) is the **staging** environment. It is not a production promotion. `APP_ENV` on that host is `staging`.

This repository is also an engineering assignment. The application and a local workflow harness were built in the same tree. The harness decides what may be called complete. A green file, a diagram, or a deploy script is not completion.

## What you can do today

On the staging site, as last checked from this repository:

| Shopper action | State |
| --- | --- |
| Browse eight garments, search, open a product and its size chart | Working over HTTPS |
| Create an account, sign in, sign out | Working. Signup on this host now expects an email confirmation |
| Keep a private cart and see server-calculated prices in cents | Implemented. Anonymous cart requests return 401 |
| Pay with Stripe test mode | Test key and webhook secret are installed. An unsigned webhook returns 400, so the secret is loaded.
| Receive the verification or password-reset email | Not confirmed. Resend accepts the key, and `contact.waleedbukhari.com` is verified in Resend. The image currently serving staging does not call the verification sender. See [Known limits](#known-limits) |
| Upload a photo and generate a try-on | Not built |

Prices, stock, and payment state are decided by the API. The browser cannot mark an order paid.

## What is not done

- The fitting room: photo upload, generation jobs, two-preview comparison, and measurement comparison beyond the size chart.
- Remote GitHub Actions runs. The workflow files exist. No remote run has been recorded from this checkout.
- A hosted NestJS Observe dashboard. Tracing code exists and is disabled on staging.
- Harness `task finish` for delivery, commerce, design, inference, and mail. Only HARNESS and FOUNDATION are verified complete in `docs/tasks.json`.

## Architecture

One modular monolith, two processes, one database.

```text
Browser
  │
  Caddy on the staging host, or the local loopback proxy
  ├── /api/*     NestJS API
  └── everything else
                 Next.js storefront
                      │
                      ▼
                 PostgreSQL 18
```

The browser calls relative `/api` paths. Next.js server reads use `INTERNAL_API_ORIGIN`. That origin is checked at startup. The app does not build API URLs from the request Host header.

Nest is split by feature. Each feature that has real behavior uses the same shape:

```text
modules/<feature>/
  presentation/     HTTP, DTOs, response mapping
  application/      use cases
  domain/           rules that do not know HTTP or the database
  infrastructure/   Drizzle and provider adapters
```

Features do not import one another's repositories. Checkout is the exception that is supposed to be shared: one database transaction rereads the price, consumes the stock reservation, and inserts the order snapshot. Stripe is called after that commit. A failed or uncertain Stripe call is not retried automatically.

Public reads are the catalog and health checks. Every other application route requires a session. Browser mutations must come from the configured public origin. The Stripe webhook is exempt from the browser origin check and is accepted only with a valid test-mode signature.

## Tech stack

Versions below are the ones pinned for this assignment, not a claim that every integration has been exercised in production.

| Layer | Choice |
| --- | --- |
| Storefront | Next.js 16, React 19 |
| API | NestJS 12 |
| Database | PostgreSQL 18, Drizzle ORM and Drizzle Kit |
| Validation | class-validator and class-transformer. The API does not use Zod for its own DTOs |
| HTTP client | native `fetch` |
| Accounts | Better Auth with its Drizzle adapter and database sessions |
| Payments | Stripe test mode only. Live keys are rejected |
| Mail | Resend, and only when `MAIL_ENABLED=true` outside local dev |
| Edge | Caddy in deployed environments |
| Containers | Two release images, `api` and `web`, plus pinned PostgreSQL and Caddy images |
| Package manager | pnpm 12.6.0, Node 24 |
| Contracts | OpenAPI generated from Nest, checked into `packages/api-contracts` |

The frontend does not import the API runtime or the database. Domain code does not import Nest or Drizzle.

## Repository map

```text
apps/web/                 Next.js storefront
apps/api/                 NestJS API, migrations, seed
packages/api-contracts/   Generated OpenAPI types
infra/                    Compose, Caddy, local proxy, release env example
scripts/harness/          Task runner: doctor, check, verify, finish
scripts/capture/          Codex capture writer and its regression test
scripts/deploy/           Release and local smoke scripts
docs/                     Scope, architecture, tasks, evidence, handoff
.harness/                 Harness config and verify run reports
.githooks/                pre-commit and commit-msg
.agent-logs/              Append-only prompt and final-response logs
.codex/                   Codex hook configuration
.commandcode/             Command Code hook configuration
```

## Local setup

These steps start the catalog and the API on your machine. They do not start Stripe, Resend, or Google, and they do not deploy anything.

Requirements: Node 24, pnpm 12.6.0, and PostgreSQL 18 listening on `127.0.0.1` only.

1. Install dependencies from the lockfile.

   ```sh
   pnpm install --frozen-lockfile
   ```

2. Create a database and user whose names make the local purpose obvious, for example database `goodform_dev` and user `goodform_dev`.

3. Copy the development template and edit it. Keep `APP_ENV=dev` and `MAIL_ENABLED=false`. Local development never sends mail, even if that flag is set to true. Leave `INFERENCE_ENABLED=false`. Stripe file paths are optional locally; without test keys, checkout returns 503.

   ```sh
   cp .env.dev.example .env.dev
   ```

   The template is an example. A real local database URL replaces `change-me`. Do not point this file at staging or production.

4. Export the variables into the shell you will use to run the apps. The API reads `DATABASE_URL` for local development. Deployments use secret files instead, and the API rejects having both `DATABASE_URL` and `DATABASE_URL_FILE` set.

5. Apply migrations and seed the eight garments.

   ```sh
   pnpm db:migrate
   pnpm db:seed
   ```

   The seed is allowed when `APP_ENV=dev`. On a release host it runs only with an explicit `--deploy` flag, and it does not refill stock that has already been reserved or sold.

6. Start the storefront and the API, then the local proxy in a second terminal.

   ```sh
   pnpm dev
   node infra/dev-proxy.mjs
   ```

7. Open [http://127.0.0.1:8080](http://127.0.0.1:8080). The proxy binds to loopback. Paths under `/api/` go to Nest on port 4000. Everything else goes to Next on port 3000.

Useful checks, from the repository root:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm contracts:check
pnpm test
pnpm test:integration   # needs DATABASE_URL
pnpm test:e2e
pnpm build
```

`pnpm test:integration` and `pnpm test:e2e` need a database and, for the browser tests, a running app. This README does not claim that every command was rerun at the moment you are reading it. Recorded results live in `docs/handoff.md` and `docs/reviews/`.

## Harness engineering

The harness is a small program and a set of documents that force the work to stay bounded, evidenced, and honest. It does not sandbox the operating system, and it cannot prove that a test suite is meaningful. It can stop a task from being marked verified when the required commands or the manual review are missing.

### The order the work followed

The sequence is the point. Later tasks were not started by skipping the tracker.

1. **Capture, before feature work.** Two real Codex sessions had to record a canary prompt and the final response. That evidence is in `CAPTURE-TEST.md` and `.agent-logs/`. Command Code has its own hooks. A Codex canary does not prove that Command Code captured anything.
2. **HARNESS, verified complete.** The runner, policy checks, and regression tests had to exist and pass before the store was treated as started.
3. **FOUNDATION, verified complete.** A real Next.js and NestJS catalog, Drizzle, migrations, seed, contracts, and the application scripts above. The harness refuses to verify an application task until those scripts exist, and then it runs them.
4. **The middle slices, after foundation.** Delivery, commerce, inference, design, and transactional mail depend on foundation. They were allowed to proceed as separate tasks. Their code is in the tree. Their harness status is not "verified complete".
5. **FITTING_ROOM, still planned.** It depends on both inference and commerce. Inference is a disabled probe. The fitting-room module does not exist.
6. **SUBMISSION, still planned.** It depends on delivery and the fitting room. It is the place for a full journey, a backup restore rehearsal, and the final limitations list.

`docs/tasks.json` is the status board. `docs/handoff.md` is the note the next session is supposed to read. If those two disagree with this README, believe the tracker and the handoff, then update this file.

### How a task is allowed to finish

```text
doctor
  → task start TASK_ID          # respects dependsOn
  → do the bounded prompt
  → write docs/reviews/TASK_ID.json with what was actually observed
  → verify TASK_ID               # runs the checks, writes .harness/runs/
  → task finish TASK_ID REPORT   # only if verify passed and the review matches
```

`verify` stops at the first failing command. It records exit codes, durations, the git commit, and a fingerprint of the source. It does not store raw command output, so a secret printed by a failing command is not copied into the evidence file. If you edit source or the review after verify, the fingerprint no longer matches and finish will refuse. That is intentional.

`task status` can record `in progress`, `blocked`, or `implemented but unverified`. It cannot set `verified complete`. Only `task finish` can.

A local test does not get to stand in for Stripe, Resend, Google, GitHub Actions, or the AWS host. The review file has a status per manual check. Missing remote evidence stays pending.

### What each harness file is for

| Path | Role | What it protects |
| --- | --- | --- |
| `AGENTS.md` | Rules for any coding agent in this repo | Stack boundaries, no co-author trailers, no weakening of checks, handoff before the next task |
| `docs/scope.md` | The accepted product and the S1–S8 checks | Stops the work from quietly becoming a different product |
| `docs/architecture.md` | The implementation specification | Module boundaries, caching, logging, release order |
| `docs/decisions.md` | Dated approvals | A later session can see what was chosen and why, without rereading chats |
| `docs/tasks.json` | Task id, dependencies, status, manual checks | One active implementation task. Finish cannot skip a dependency |
| `docs/task-template.md` | The shape of a task | New work has the same fields as the work already tracked |
| `docs/prompts/01` through `04` | Bounded prompts for foundation, delivery, inference, and design | A session implements one slice, not the whole store in one prompt |
| `docs/session-workflow.md` | How to open and close a session | The next chat reads the handoff instead of a pasted transcript |
| `docs/handoff.md` | Current truth: commands, results, blockers | Failed attempts stay visible. The next action is explicit |
| `docs/reviews/TASK_ID.json` | Human or agent attestation of manual checks | Verify will not finish a task whose review is missing or stale |
| `docs/evidence/` | The frozen verify report copied by `task finish` | Completed tasks keep the report that justified them |
| `.harness/config.json` | Required documents, harness tests, and the application script list | Application verify runs those pnpm scripts. It does not invent its own |
| `.harness/runs/` | One JSON report per verify attempt | You can see which command failed without storing secret-bearing logs |
| `scripts/harness/cli.mjs` | `doctor`, `install`, `check`, `verify`, `task`, `commit-msg`, `ci` | The only supported way to move a task's status |
| `scripts/harness/lib.mjs` | Policy, fingerprints, verify, and finish | Shared rules so the CLI and the tests do not drift |
| `scripts/harness/tests.test.mjs` | Regression tests in temporary directories | The harness is tested outside this repo's real task files |
| `scripts/capture/codex.mjs` | Append-only capture writer | Existing log bytes are not rewritten |
| `scripts/capture/codex.test.mjs` | Capture regression tests | Appends, crashes, and branched sessions have a test |
| `.codex/hooks.json` | Codex session hooks | Starts the capture path for Codex. It does not configure Command Code |
| `.commandcode/settings.json` | Command Code hooks | Separate from Codex. It still needs its own live canary |
| `.agent-logs/` | The captured prompts and final responses | Part of the submission. Do not summarize or delete entries after the fact |
| `CAPTURE-TEST.md` | The record of the live canaries | Fixture tests are not a substitute for this file |
| `.githooks/pre-commit` | Runs harness policy on commit | Rejects obvious secrets and historical-log edits |
| `.githooks/commit-msg` | Rejects `Co-authored-by` trailers | Commit messages stay single-author, per the assignment rule |
| `.github/workflows/harness.yml` | CI job for harness tests and `cli.mjs ci` | Repeats the policy on pull requests. A workflow file is not proof that GitHub has run it |
| `.github/workflows/application.yml` | Application CI once the scripts exist | Format, lint, types, contracts, tests, build |
| `.github/workflows/release.yml` | Build images and deploy through the release script | Production promotion is a separate, gated job. It has not been run |

Install the git hooks once per checkout:

```sh
node scripts/harness/cli.mjs install
node scripts/harness/cli.mjs doctor
```

`doctor` prints the Node version, whether the hooks path is `.githooks`, and the task list. It does not check AWS, Stripe, or GitHub.

### What the harness is not

It is not an adversarial sandbox. Shell commands are not blocked by the secret-file guard. Credential checks are heuristics. Someone can still bypass local git hooks with Git's own flags. The CI workflow is there so the same policy runs again on a server. That remote run has not been observed from this checkout.

Do not weaken a check, skip a failing test, or mark a review "pass" because the code looks right. Write down the command and what it printed.

## Staging deployment

Staging runs on one EC2 instance in `ap-south-1`, reached only through Systems Manager. The security group allows public TCP 80 and 443. There is no SSH port. Caddy terminates TLS for `goodform.waleedbukhari.com` and routes `/api/*` to Nest.

Release images are pushed to ECR by digest. `scripts/deploy/release.sh` checks the env file, backs up PostgreSQL, runs migrations from the candidate API image, runs the guarded catalog seed, waits until API, web, and Caddy are healthy, then smoke-checks HTTPS. A failed application rollout can return to the previous image digests. It does not roll the database backward.

Secrets stay in files on the host under `/opt/goodform/secrets/`. The env file stores paths. Stripe test mode is selected with `ENABLE_STRIPE_TEST=true`, which adds `infra/compose.stripe-test.yml`. Mail is selected with `ENABLE_MAIL=true`, which adds `infra/compose.mail.yml`. Those overlays are how the running API sees the keys. Putting a key only in your laptop shell does nothing to the host.

Current host facts, and the documents that should be updated if they change:

- Domain: `https://goodform.waleedbukhari.com`
- Compose project: staging
- Mail sender, when the overlay is on: `Goodform <reply@contact.waleedbukhari.com>`
- Details and command ids: `docs/handoff.md` and `docs/delivery.md`

Do not print the secret files. The API rejects a live Stripe secret key. It accepts `sk_test_` or `rk_test_`, and a webhook secret that starts with `whsec_`.

## Known limits

- **The fitting room must not be described as available.** The Google probe is disabled. No try-on call has been made.

## Where to read next

| Question | Document |
| --- | --- |
| What was approved | `docs/scope.md`, `docs/decisions.md` |
| How the system is shaped | `docs/architecture.md` |
| What to do next | `docs/handoff.md`, `docs/tasks.json` |
| How sessions hand off | `docs/session-workflow.md`, `docs/harness.md` |
| How deploy works | `docs/delivery.md` |
| How checkout and stock work | `docs/commerce.md` |
| Why try-on is blocked | `docs/inference.md` |
