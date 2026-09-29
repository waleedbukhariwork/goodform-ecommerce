# Local catalog development

Use Node 24 and pnpm 12.6.0. Start a local PostgreSQL 18 database bound to loopback. Create a dedicated disposable `goodform_dev` database and user. Set `APP_ENV=dev`, `DATABASE_URL`, `PORT=4000` and `INTERNAL_API_ORIGIN=http://127.0.0.1:4000` in the shell or explicitly source a local environment file. Templates are placeholders only; runtime configuration wins and no production file is a development fallback.

Run `pnpm install --frozen-lockfile`, `pnpm db:migrate`, `pnpm db:seed`, then `pnpm dev`. Run `node infra/dev-proxy.mjs` in another terminal and visit `http://127.0.0.1:8080`. The proxy routes `/api/*` to Nest and everything else to Next. It binds to loopback. For deployment and isolated environment configuration, see `docs/delivery.md`.

The seed reruns through slug upserts. It is restricted to `APP_ENV=dev`. Product assets are documented in `docs/catalog-assets.md`. No cloud, Observe dashboard or external provider access is established by this slice.
