# OrbitPilot — Copilot Instructions

## Build & Run Commands

```bash
# Full stack (Docker)
docker compose up --build           # Build and start all services
docker compose up -d                # Start in background
docker compose down -v              # Stop and remove volumes

# Backend (from backend/)
npm run build                       # Compile NestJS (nest build)
npm run start:dev                   # Dev mode with watch
npm run start:prod                  # Production mode (node dist/main)

# Frontend (from frontend/)
npm run dev                         # Vite dev server on :3200
npm run build                       # TypeScript check + Vite production build

# Database (from project root or backend/)
npx prisma generate --schema=./prisma/schema.prisma
npx prisma migrate deploy --schema=./prisma/schema.prisma
npx ts-node ./prisma/seed.ts        # Seed with test data
```

No test suite exists yet. If adding tests, use Jest for backend (`@nestjs/testing`) and Vitest for frontend.

## Architecture

This is a monorepo with three workspaces sharing one Docker Compose deployment:

- **`frontend/`** — React SPA served by nginx in Docker; proxies `/api` to the backend
- **`backend/`** — NestJS REST API on port 3001; all routes prefixed with `/api`
- **`prisma/`** — Schema and migrations at project root, shared by backend and seed script

### Backend Module Structure

Each domain is a self-contained NestJS module (`module.ts`, `service.ts`, `controller.ts`, `dto/`). Modules never import each other's services directly — they import the module and use its exports. The `PrismaModule` is `@Global()` so `PrismaService` is available everywhere without explicit imports.

Key modules and their responsibilities:
- `auth/` — JWT login only (no registration endpoint); guards protect all other routes
- `dashboard/` — Read-only aggregation service that queries across teams, work, capacity, insights
- `insights/` — Rule-based engine with private methods per rule (e.g., `checkTeamCapacity`); designed to be extended with new rule methods or swapped for an LLM provider
- `integrations/jira/` and `integrations/github/` — OAuth 2.0 integration services; return mock data when OAuth env vars are not set. OAuth endpoints (`auth-url`, `callback`, `disconnect`) handle the full flow. Callback endpoints are NOT behind JwtAuthGuard (called by OAuth redirect). State parameter validation prevents CSRF.

### Frontend Architecture

- **Routing**: React Router v6 with nested routes inside `AppLayout`; unauthenticated users redirect to `/login`
- **Auth**: JWT stored in `localStorage`; `AuthContext` validates token on mount via `GET /api/users/me`
- **API layer**: Centralized Axios client (`api/client.ts`) with auto-attached Bearer token and 401 → logout interceptor. All API calls go through service functions in `api/services.ts`
- **State**: Local component state + `useApi` hook for data fetching. No global state library.

### Data Flow for Dashboard

`GET /api/dashboard` → `DashboardService` queries Teams, WorkItems, Capacity, Insights in parallel → returns a single `DashboardData` object → Frontend `DashboardPage` renders MetricCards, CapacityChart, TopPriorities, InsightCards.

## Conventions

### Backend

- All controllers use `JwtAuthGuard` except `POST /auth/login`
- DTOs use `class-validator` decorators; the global `ValidationPipe` with `whitelist: true` strips unknown properties
- Prisma models use `@@map()` for snake_case table names; TypeScript uses camelCase
- Services throw NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.) — no manual HTTP status codes in controllers
- Integration services use OAuth 2.0; fall back to mock data if `*_CLIENT_ID` env vars are not set

### Frontend

- All colors use the `orbit-*` Tailwind theme tokens (never hardcode hex values)
- Reusable CSS classes in `index.css`: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.gradient-text`
- Icons from `lucide-react` only
- Charts use `recharts` with dark theme colors from the orbit palette
- Pages handle three states: loading (`Spinner`), error (`ErrorState` with retry), empty (`EmptyState`)
- Path alias: `@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.json`)

### Brand / Design

- Dark UI: background `orbit-navy` (#0F172A), cards `orbit-card` (#1E293B)
- Accent gradient: blue→purple (`bg-gradient-brand`)
- Font: Inter (loaded from Google Fonts in `index.html`)
- Cards have rounded corners (`rounded-xl`), subtle border, and blue glow on hover
- Severity colors: info=blue, warning=amber, critical/error=red, success=green

### Docker

- Build context is the project root (`.`) for both services — Dockerfiles reference paths relative to root
- Backend CMD runs migration → seed → start (seed is idempotent via upserts)
- Frontend nginx proxies `/api` to `http://backend:3001`

## Environment Variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `JWT_SECRET` | Backend | JWT signing key |
| `PORT` | Backend | Listen port (default 3001) |
| `APP_URL` | Backend | Public URL for OAuth callbacks (default `http://localhost:3200`) |
| `GITHUB_CLIENT_ID` | Backend | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Backend | GitHub OAuth App client secret |
| `JIRA_CLIENT_ID` | Backend | Atlassian OAuth 2.0 (3LO) client ID |
| `JIRA_CLIENT_SECRET` | Backend | Atlassian OAuth 2.0 (3LO) client secret |

## Seeded Test User

- Email: `rlopes@intermedia.com`
- Password: `admin123`
- Role: `admin`
