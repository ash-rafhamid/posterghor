# syntax=docker/dockerfile:1
#
# Poster API — Express + MongoDB + Gemini + headless Chromium.
# Build context is the REPO ROOT (the API depends on the packages/shared workspace):
#
#   docker build -f apps/api/Dockerfile -t posterghor-api .
#   docker run -p 4000:4000 --env-file apps/api/.env posterghor-api
#
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace=@poster/api --include-workspace-root --no-audit --no-fund

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @poster/api

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    CHROME_PATH=/usr/bin/chromium \
    PORT=4000
# System Chromium (the poster renderer) + the fonts it may fall back to
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev --workspace=@poster/api --include-workspace-root --no-audit --no-fund
COPY packages/shared packages/shared
COPY --from=build /app/apps/api/dist apps/api/dist
RUN chown -R node:node /app
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
