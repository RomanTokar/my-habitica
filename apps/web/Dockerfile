# Stage 1: builder
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy workspace root package files first for better cache layering
COPY package.json bun.lock* ./
COPY apps/web/package.json ./apps/web/

# Install dependencies for the web workspace
RUN bun install --frozen-lockfile

# Copy web source
COPY apps/web/ ./apps/web/

# Build the Vite app (outputs to apps/web/dist/)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Stage 2: runner (unprivileged nginx on port 8080)
FROM nginxinc/nginx-unprivileged:alpine AS runner

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
