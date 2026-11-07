# syntax=docker/dockerfile:1

# ---- 1. Front-end build (Vite + React) ----
FROM node:22-alpine AS web
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- 2. API dependencies (production only) ----
FROM node:22-alpine AS api-deps
RUN corepack enable
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---- 3. Runtime: one Node process serving the API, the photos (GridFS) and the built site ----
# All data (texts, photos, users, bookings…) lives in MongoDB — see MONGODB_URI.
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/dist \
    SHARED_DIR=/app/shared
WORKDIR /app/server
COPY --from=api-deps /app/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY shared /app/shared
COPY --from=web /app/dist /app/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "src/index.js"]
