FROM node@sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe AS build
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-contracts/package.json packages/api-contracts/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store corepack pnpm install --filter @goodform/api... --frozen-lockfile
COPY apps/api apps/api
COPY packages/api-contracts packages/api-contracts
RUN corepack pnpm --filter @goodform/api build && corepack pnpm --filter @goodform/api deploy --prod /release/api && test -f /release/api/drizzle/meta/_journal.json && test -f /release/api/dist/scripts/migrate.js && test -f /release/api/dist/scripts/seed.js

FROM node@sha256:8ec5d7557396cfe32d21c3f9c13072355ceab22b584578ca4bb28af31120cffe
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /release/api/ ./
USER node
EXPOSE 4000
STOPSIGNAL SIGTERM
CMD ["node", "dist/src/main.js"]
