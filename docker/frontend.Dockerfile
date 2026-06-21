FROM node:24-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./

COPY lib/db/package.json lib/db/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY artifacts/nac-manager/package.json artifacts/nac-manager/

RUN pnpm install --frozen-lockfile

COPY lib/ lib/
COPY artifacts/nac-manager/ artifacts/nac-manager/

RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/nac-manager run build

FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/artifacts/nac-manager/dist /usr/share/nginx/html

COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/index.html || exit 1
