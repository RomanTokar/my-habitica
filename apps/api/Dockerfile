# Stage 1: builder
FROM oven/bun:1.3.9 AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Copy shared packages if present
COPY packages/ ./packages/

# Install all dependencies
RUN bun install --frozen-lockfile

# Build shared package (API depends on it)
RUN cd packages/shared && bun run build

# Copy API source
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json* ./

# Build the NestJS app
WORKDIR /app/apps/api
RUN bun run build

# Stage 2: runner
FROM oven/bun:1.3.9-slim AS runner

WORKDIR /app

# Copy built output and production deps from builder
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/apps/api/src/db/migrations ./src/db/migrations
COPY --from=builder /app/apps/api/drizzle.config.ts ./drizzle.config.ts

# Non-root user for security
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser
USER appuser

EXPOSE 3001

CMD ["bun", "run", "dist/main.js"]
