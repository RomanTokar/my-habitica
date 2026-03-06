## Project Overview

my-habitica is a Habitica clone — a gamified task management app. It uses a **bun monorepo** with three workspace packages:

- `apps/api` — NestJS backend (REST API, JWT auth, Drizzle ORM, PostgreSQL)
- `apps/web` — React SPA (Vite, TailwindCSS v4, shadcn/ui, React Query)
- `packages/shared` — Shared types, Zod validation schemas, and scoring formulas

## Commands

```bash
# Install dependencies
bun install

# Run dev servers (API on :3001, Web on :5173)
bun run dev

# Run individual apps
bun run --filter @my-habitica/api dev
bun run --filter @my-habitica/web dev

# Build (shared must build first)
bun run build

# Typecheck / lint all workspaces
bun run typecheck
bun run lint

# Database (run from apps/api/)
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Run migrations
bun run db:push       # Push schema directly (dev only)

# Docker (local Postgres + full stack)
docker compose up postgres        # Just the database
docker compose up                 # Full stack
```

## Architecture

### Authentication
- JWT stored in HTTP-only cookies (not localStorage)
- Global `JwtAuthGuard` on all routes; use `@Public()` decorator to bypass
- `@CurrentUser()` decorator extracts user from request
- Frontend axios interceptor redirects to `/login` on 401

### Task System
- **Single-table polymorphism**: all task types (habit, daily, todo, reward) share one `tasks` table with type-specific nullable columns
- Scoring formulas live in `packages/shared/src/scoring/formula.ts` — shared between frontend (optimistic updates) and backend
- Zod schemas in `packages/shared/src/validation/` are shared for frontend form validation and backend input validation

### Cron System
- Implemented as NestJS middleware (`apps/api/src/cron/cron.middleware.ts`), not a scheduled job
- Runs lazily on authenticated requests, once per UTC day per user
- Handles: daily task resets, missed-daily penalties, habit counter resets

### Frontend State
- **React Query** for all server state (no Zustand/Redux)
- Optimistic updates for task scoring and deletion
- Query keys: `['tasks', type]`, `['user']`
- Hooks in `apps/web/src/hooks/`: `use-auth`, `use-tasks`, `use-user`

### Database
- Drizzle ORM with `node-postgres` driver
- Schema: `apps/api/src/db/schema.ts`
- Config: `apps/api/drizzle.config.ts`
- Local DB: `postgresql://habitica:habitica@localhost:5432/habitica`

### Infrastructure
- Terraform in `infra/terraform/` targeting AWS
- Backend: ECS Fargate + ALB + RDS PostgreSQL
- Frontend: S3 + CloudFront (SPA with fallback to index.html)
- Secrets: AWS Secrets Manager (JWT_SECRET, DATABASE_URL)
- Container images: ECR with lifecycle policies

## Key Conventions

- API modules follow NestJS pattern: `*.module.ts`, `*.controller.ts`, `*.service.ts`
- UI components use shadcn/ui in `apps/web/src/components/ui/`
- The shared package must be built (`bun run --filter @my-habitica/shared build`) before the API or web can consume its exports
- Tailwind CSS v4 with `@tailwindcss/vite` plugin (no tailwind.config.js)
