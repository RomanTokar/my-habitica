# Stage 1: builder
FROM oven/bun:1.3.9 AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Copy shared packages and root tsconfig (needed by all builds)
COPY packages/ ./packages/
COPY tsconfig.base.json ./

# Install all dependencies
RUN bun install --frozen-lockfile

# Build shared package (API depends on it)
RUN cd packages/shared && bun run build

# Copy API source
COPY apps/api/ ./apps/api/

# Build the NestJS app
WORKDIR /app/apps/api
RUN bun run build

# Stage 2: runner
FROM oven/bun:1.3.9-slim AS runner

WORKDIR /app

# Root node_modules contains the actual package files under .bun/ cache
COPY --from=builder /app/node_modules ./node_modules
# API workspace node_modules contains .bin/ symlinks (e.g. drizzle-kit) that point into root .bun/
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Shared package is referenced via symlink: apps/api/node_modules/@my-habitica/shared -> ../../../../packages/shared
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

# Copy built API output under its workspace path so relative paths in package.json scripts resolve correctly
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/src/db/migrations ./apps/api/src/db/migrations
COPY --from=builder /app/apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts

# Set WORKDIR to the API package so bun resolves scripts and .bin/ from apps/api/node_modules
WORKDIR /app/apps/api

# Non-root user for security (bun user is built into the image)
USER bun

EXPOSE 3001

CMD ["bun", "run", "dist/main.js"]
