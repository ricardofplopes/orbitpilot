<p align="center">
  <img src="docs/logo.svg" alt="OrbitPilot" width="500" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OrbitPilot-v1.0.0-blue?style=for-the-badge" alt="version" />
  <img src="https://img.shields.io/badge/docker-compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="docker" />
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="react" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs" />
</p>

# OrbitPilot

**Plan better. Deliver together.**

OrbitPilot is an internal engineering planning platform for team capacity, quarterly planning, delivery visibility, and AI-assisted insights. It connects to Jira and GitHub to help engineering managers plan work, check capacity, identify risks, and track delivery.

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/get-started/) (with Docker Compose)

### Run the application

```bash
docker compose up --build
```

That's it! Once all services are running:

- **Frontend**: [http://localhost:3200](http://localhost:3200)
- **Backend API**: [http://localhost:3001/api](http://localhost:3001/api)
- **Database**: PostgreSQL on port 5432

### Login Credentials

| Email | Password | Role |
|-------|----------|------|
| rlopes@intermedia.com | admin123 | Admin |

---

## 📦 Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Frontend (React)  │────▶│  Backend (NestJS)   │────▶│  PostgreSQL 15   │
│   Port 3200         │     │  Port 3001          │     │  Port 5432       │
│   Nginx + Vite      │     │  REST API           │     │  Prisma ORM      │
└─────────────────────┘     └─────────────────────┘     └──────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + NestJS + Prisma |
| Database | PostgreSQL 15 |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | JWT + bcrypt |
| Infrastructure | Docker Compose |

---

## 🧩 Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Metric cards, capacity charts, top priorities, AI insights |
| **Capacity Planning** | Team capacity, PTO tracking, availability management |
| **Quarterly Planning** | Quarter plans, initiatives, effort estimation, overcommitment detection |
| **Teams** | Team CRUD, member management, role assignment |
| **Work Items** | Track work from manual entry, Jira, or GitHub |
| **Integrations** | Jira and GitHub OAuth 2.0 connection (one-click connect) |
| **Insights** | Rule-based AI insights (extensible for LLM later) |
| **Reports** | Team and quarter summary reports |

---

## 📁 Project Structure

```
orbitpilot/
├── docker-compose.yml          # Full-stack Docker orchestration
├── prisma/
│   ├── schema.prisma           # Database schema (10 models)
│   ├── seed.ts                 # Seed data script
│   └── migrations/             # Database migrations
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── main.ts             # NestJS bootstrap
│       ├── app.module.ts       # Root module
│       ├── auth/               # JWT authentication
│       ├── users/              # User management
│       ├── teams/              # Teams & members
│       ├── capacity/           # Capacity planning
│       ├── planning/           # Quarterly planning
│       ├── work/               # Work items
│       ├── integrations/       # Jira & GitHub
│       ├── insights/           # AI insights engine
│       ├── dashboard/          # Dashboard aggregation
│       └── reports/            # Reporting
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.tsx             # Router + auth
        ├── pages/              # 10 page components
        ├── components/         # Reusable UI components
        │   ├── layout/         # AppLayout, Sidebar, Topbar
        │   ├── cards/          # MetricCard, InsightCard, IntegrationCard
        │   ├── charts/         # CapacityChart, StatusChart
        │   ├── tables/         # PlanningTable, TeamTable
        │   └── common/         # Button, Input, Modal, Spinner, etc.
        ├── api/                # Axios client + service functions
        ├── context/            # Auth context
        ├── hooks/              # Custom hooks
        └── types/              # TypeScript interfaces
```

---

## 🎨 Design

OrbitPilot features a dark space-inspired UI with:

- Navy/black backgrounds (`#0F172A`)
- Blue-to-purple gradients (`#2563EB` → `#7C3AED`)
- Inter typography
- Rounded cards with subtle glow effects
- Professional SaaS dashboard feel
- Responsive sidebar navigation

---

## 🔌 Integrations

### Jira

Configure via **Settings → Integrations → Jira**:
- Jira base URL
- Email / username
- API token
- Project keys

Currently uses mock data. The service uses a Strategy pattern — swap `MockJiraService` for `RealJiraService` when ready.

### GitHub

Configure via **Settings → Integrations → GitHub**:
- GitHub organization
- Repositories
- Personal access token

Same mock-first pattern as Jira.

---

## 🤖 Orbit Pilot Insights

The insights engine generates rule-based observations:

- "Team X is over capacity by Y%"
- "Frontend has N high-priority items without owner"
- "Q3 plan has more committed work than available capacity"
- "Cycle time increased compared to previous period"

The engine is modular — each rule is a function that can be swapped for an LLM-powered version later.

---

## 🛠 Development

### Local development (without Docker)

```bash
# Start PostgreSQL (you can use Docker for just the DB)
docker compose up db

# Backend
cd backend
npm install
npx prisma generate --schema=../prisma/schema.prisma
npx prisma migrate deploy --schema=../prisma/schema.prisma
npx ts-node ../prisma/seed.ts
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

### Configuration

All configurable parameters are managed via a `.env` file in the project root. Copy the example to get started:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `orbitpilot` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `orbitpilot` | PostgreSQL password |
| `POSTGRES_DB` | `orbitpilot` | PostgreSQL database name |
| `DATABASE_URL` | `postgresql://orbitpilot:orbitpilot@db:5432/orbitpilot` | Full connection string |
| `JWT_SECRET` | `orbitpilot-dev-secret-change-in-production` | JWT signing secret |
| `PORT` | `3001` | Backend API port |
| `APP_URL` | `http://localhost:3200` | Public URL (used for OAuth callbacks) |
| `FRONTEND_PORT` | `3200` | Frontend host port |
| `GITHUB_CLIENT_ID` | _(empty)_ | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | _(empty)_ | GitHub OAuth App client secret |
| `JIRA_CLIENT_ID` | _(empty)_ | Atlassian OAuth 2.0 (3LO) client ID |
| `JIRA_CLIENT_SECRET` | _(empty)_ | Atlassian OAuth 2.0 (3LO) client secret |

> **Note:** When `GITHUB_CLIENT_ID` or `JIRA_CLIENT_ID` are empty, the app runs in **mock mode** with sample data — fully functional for demos.

### Setting Up OAuth Integrations

Both integrations work in **mock mode** when OAuth credentials are not configured — the app displays sample data so you can explore without external accounts.

#### GitHub OAuth App

1. Go to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set **Authorization callback URL** to `http://localhost:3200/api/integrations/github/callback`
4. Copy the **Client ID** and generate a **Client Secret**
5. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in your environment or `.env` file

#### Jira / Atlassian OAuth 2.0 (3LO)

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create a new **OAuth 2.0 (3LO)** app
3. Add callback URL: `http://localhost:3200/api/integrations/jira/callback`
4. Enable scopes: `read:jira-work`, `read:jira-user`, `manage:jira-project`, `offline_access`
5. Copy the **Client ID** and **Client Secret**
6. Set `JIRA_CLIENT_ID` and `JIRA_CLIENT_SECRET` in your environment or `.env` file

---

## 📊 Seed Data

The seed script creates:
- **10 users** (1 admin + 9 team members)
- **5 teams** (Platform, Payments, Mobile, Data, Web)
- **2 quarter plans** (Q2 2026 completed, Q3 2026 active)
- **7 initiatives** across teams
- **33 work items** (manual + Jira + GitHub sources)
- **PTO/availability** entries
- **AI insights** pre-generated

---

## 📝 License

Internal use only.
