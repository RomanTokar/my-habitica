# My Habitica

A full-stack Habitica clone — gamified task management with habits, dailies, to-dos, and rewards. Built with NestJS, React, and PostgreSQL in a Bun monorepo.

## Features

- **Four task types** — Habits (±scoring), Dailies (streaks + scheduling), To-Dos (with checklists), Rewards (spend gold)
- **Gamified scoring** — Exponential decay formula; earn gold by completing tasks, lose HP for missed dailies
- **Value-based color coding** — Task borders shift red → green based on performance history
- **Drag-and-drop reordering** — Mouse, touch, and keyboard support via dnd-kit
- **Responsive UI** — 4-column grid on desktop, tabbed view on mobile
- **Lazy cron system** — Daily resets, missed-daily penalties, and habit counter resets run automatically on first request each UTC day
- **Secure auth** — JWT in HTTP-only cookies, bcrypt password hashing

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun 1.3.9+ |
| Backend | NestJS 10, Drizzle ORM, PostgreSQL 16 |
| Frontend | React 18, Vite 6, Tailwind CSS v4, shadcn/ui |
| State | TanStack React Query 5 |
| Validation | Zod (shared between frontend and backend) |
| Auth | Passport JWT, bcryptjs, HTTP-only cookies |
| DnD | dnd-kit |
| Infrastructure | AWS ECS Fargate, RDS, S3 + CloudFront |
| IaC | Terraform |
| CI/CD | GitHub Actions |

## Project Structure

```
my-habitica/
├── apps/
│   ├── api/          # NestJS REST API (port 3001)
│   └── web/          # React SPA (port 5173)
├── packages/
│   └── shared/       # Zod schemas, TypeScript types, scoring formula
├── infra/
│   ├── bootstrap/    # One-time Terraform S3 state backend setup
│   └── terraform/    # AWS infrastructure (ECS, RDS, S3, CloudFront)
├── .github/
│   └── workflows/    # CI, deploy, and destroy pipelines
└── docker-compose.yml
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3.9+
- [Docker](https://www.docker.com) (for local PostgreSQL)

### Install

```bash
bun install
```

### Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://habitica:habitica@localhost:5432/habitica` |
| `JWT_SECRET` | Secret for signing JWTs | *(required — set a random value)* |
| `PORT` | API server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `FRONTEND_URL` | CORS origin | `http://localhost:5173` |

### Start the database

```bash
docker compose up postgres
```

### Run migrations

```bash
cd apps/api
bun run db:migrate
```

### Start dev servers

```bash
bun run dev
```

- API: http://localhost:3001
- Web: http://localhost:5173

## Docker

Run the full stack (Postgres + API + Web) with Docker:

```bash
docker compose up
```

Or just the database:

```bash
docker compose up postgres
```

## Scripts

Run from the monorepo root:

```bash
bun run dev          # Start API and Web in parallel
bun run build        # Build all packages (shared → api → web)
bun run typecheck    # Type-check all workspaces
bun run lint         # Lint all workspaces
bun run test         # Test all workspaces
```

Database commands (run from `apps/api/`):

```bash
bun run db:generate  # Generate Drizzle migrations from schema changes
bun run db:migrate   # Apply migrations
bun run db:push      # Push schema directly (dev only)
```

## API Endpoints

All routes require authentication (JWT cookie) unless marked **public**.

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user *(public)* |
| `POST` | `/auth/login` | Log in *(public)* |
| `POST` | `/auth/logout` | Log out *(public)* |
| `GET` | `/health` | Database health check *(public)* |
| `GET` | `/users/me` | Get current user profile |
| `GET` | `/tasks?type=` | List tasks by type (`habit`, `daily`, `todo`, `reward`) |
| `GET` | `/tasks/:id` | Get a single task |
| `POST` | `/tasks` | Create a task |
| `PUT` | `/tasks/:id` | Update a task |
| `DELETE` | `/tasks/:id` | Delete a task |
| `DELETE` | `/tasks/completed` | Clear all completed to-dos |
| `POST` | `/tasks/:id/score/:direction` | Score a task (`up` or `down`) |
| `POST` | `/tasks/:id/move/:position` | Reorder a task |

## Architecture

### Authentication
JWT tokens are stored in HTTP-only cookies (7-day expiry). A global `JwtAuthGuard` protects all routes; use the `@Public()` decorator to opt out. The `@CurrentUser()` decorator extracts the authenticated user from the request.

### Scoring Formula
The scoring system is shared between frontend and backend via `packages/shared/src/scoring/formula.ts`. It uses Habitica's original exponential decay formula — task value (clamped between −47.27 and +21.27) decays as tasks are missed and recovers as they are completed. Priority multipliers (trivial 0.1×, easy 1×, medium 1.5×, hard 2×) scale gold rewards.

### Cron System
Rather than a scheduled job, daily maintenance runs lazily as NestJS middleware on the first authenticated request each UTC day per user. It handles:
- Resetting daily tasks for the new day
- Applying HP penalties for missed dailies
- Resetting habit counters when their period elapses

### Frontend State
React Query manages all server state with optimistic updates for task scoring, deletion, and clearing completed to-dos. Query keys are `['tasks', type]` and `['user']`. There is no client-side store (no Zustand or Redux).

### Database Schema
All four task types share a single `tasks` table (single-table polymorphism) with type-specific nullable columns. Tasks have a composite index on `(userId, type, position)` for ordered retrieval.

## Infrastructure

Deployed to AWS using Terraform:

| Resource | Service |
|---|---|
| API containers | ECS Fargate |
| Load balancing | Application Load Balancer |
| Database | RDS PostgreSQL |
| Frontend hosting | S3 + CloudFront |
| Container registry | ECR |
| Secrets | AWS Secrets Manager |
| Networking | VPC with public/private subnets |

State is stored in S3 (bootstrapped via `infra/bootstrap/`).

## CI/CD

Three GitHub Actions workflows:

- **CI** (`ci.yml`) — Runs on PRs to `main`: typecheck, build, Dockerfile lint (hadolint), `terraform plan`
- **Deploy** (`deploy.yml`) — Runs on push to `main`: `terraform apply` → build and push API image to ECR → run DB migrations via ECS → update ECS service → build and sync web SPA to S3 → invalidate CloudFront
- **Destroy** (`destroy.yml`) — Tears down all AWS infrastructure
