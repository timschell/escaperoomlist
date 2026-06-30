# syntax=docker/dockerfile:1

# ---- Stage 1: build the PWA client ----
FROM node:22-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run gen:icons && npm run build

# ---- Stage 2: install server production deps ----
FROM node:22-slim AS server-deps
WORKDIR /app/server
# Toolchain in case a native module (better-sqlite3) has no matching prebuild.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm ci --omit=dev

# ---- Stage 3: runtime ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data
WORKDIR /app/server

COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/ ./
COPY --from=client /app/client/dist ./public

# Run as the unprivileged "node" user; pre-own /data so the named volume is writable.
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
