# Dockerfile racine — build le bundle web Expo + le backend dans la même image.
# Dans Dokploy : build context = racine du repo, Dockerfile = ./Dockerfile.

# 1) Build du bundle web Expo (sortie : /web/dist)
FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY app/package.json app/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY app/ ./
RUN npx expo export --platform web

# 2) Install des deps backend (prod only)
FROM node:22-bookworm-slim AS backend-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 3) Build TypeScript backend
FROM node:22-bookworm-slim AS backend-build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npx tsc -p tsconfig.json

# 4) Runtime
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY --from=web /web/dist ./public
COPY backend/package.json ./
RUN mkdir -p /app/data
VOLUME ["/app/data"]
ENV DATA_DIR=/app/data
ENV WEB_PUBLIC_DIR=/app/public
EXPOSE 8787
CMD ["node", "dist/server.js"]
