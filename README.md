# Kensan

<p align="center">
  <img src="docs/design/kensan-logo-dark.svg" alt="Kensan Logo" width="200">
</p>

<p align="center">
  <strong>AI-Powered Personal Productivity App for Engineers</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> |
  <a href="#features">Features</a> |
  <a href="#tech-stack">Tech Stack</a> |
  <a href="#getting-started">Getting Started</a> |
  <a href="#architecture">Architecture</a> |
  <a href="#project-structure">Project Structure</a>
</p>

---

## Overview

Kensan is a personal productivity application designed for software engineers. It integrates time management, task management, learning records, and AI-powered weekly reviews to help engineers achieve their goals through continuous self-improvement.

**Kensan** は、エンジニア向けのパーソナル生産性アプリケーションです。時間管理、タスク管理、学習記録、AI週次レビューを統合し、目標達成と自己改善をサポートします。

---

## Features

- **Goal & Task Management** - Hierarchical goals with milestones and tasks, Kanban board view
- **Time Block Planning** - Visual daily/weekly time block planning with drag & drop
- **Rich Note Editor** - TipTap-based rich text editor with image support and semantic search
- **AI Chat Agent** - Gemini-powered conversational agent with 39+ tools for direct DB operations
- **AI Weekly Review** - Automated structured weekly review generation
- **Fact Extraction** - Automatic extraction of user preferences, habits, and skills from conversations
- **Analytics Dashboard** - Visualize productivity trends and goal progress
- **Data Lakehouse** - Apache Iceberg + Dagster pipeline for advanced analytics
- **Observability** - Full OpenTelemetry integration (Grafana, Prometheus, Loki, Tempo)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Zustand, Tailwind CSS 4, shadcn/ui, TipTap |
| **Backend** | Go 1.24, Chi router, pgx, JWT authentication |
| **AI Service** | Python 3.12, FastAPI, Google Gemini API (GenAI SDK) |
| **Database** | PostgreSQL 16 + pgvector |
| **Storage** | MinIO (S3-compatible object storage) |
| **Data Pipeline** | Apache Iceberg, Dagster, Polaris REST Catalog |
| **Observability** | OpenTelemetry, Grafana, Prometheus, Loki, Tempo |
| **Infrastructure** | Docker Compose, GCE (Google Compute Engine) |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Google AI Studio API Key](https://aistudio.google.com/apikey) (for Gemini)

### 1. Clone the repository

```bash
git clone https://github.com/yu-min3/kensan-mockup.git
cd kensan-mockup
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set your Google API key:

```bash
GOOGLE_API_KEY=your-google-api-key-here
```

### 3. Start all services

```bash
make up
```

This starts all services via Docker Compose:
- Frontend: http://localhost:5173
- Backend APIs: http://localhost:8081-8091
- Grafana: http://localhost:3000

### 4. Login

Use the demo account:
- Email: `test@kensan.dev`
- Password: `password123`

### Local Development (without Docker)

```bash
# Frontend
npm install
npm run dev

# Backend
cd backend && make build && make test

# AI Service
cd kensan-ai
pip install -e .
uvicorn kensan_ai.main:app --reload --port 8089
```

---

## Architecture

Kensan follows a **React SPA + Go Microservices + Python AI Service** architecture.

```
Browser (React SPA)
  ├── user-service     (Go, :8081) - Auth, Settings
  ├── task-service     (Go, :8082) - Goals, Tasks
  ├── timeblock-service(Go, :8084) - Time Planning
  ├── analytics-service(Go, :8088) - Analytics
  ├── memo-service     (Go, :8090) - Memo
  ├── note-service     (Go, :8091) - Notes + MinIO
  └── kensan-ai        (Py, :8089) - AI Chat + Gemini API
                            │
                      PostgreSQL 16 + pgvector
```

For detailed architecture documentation, see:
- [Overall Architecture](ARCHITECTURE.md)
- [Backend Architecture](backend/ARCHITECTURE.md)
- [Frontend Architecture](src/ARCHITECTURE.md)
- [AI Service Architecture](kensan-ai/ARCHITECTURE.md)

---

## Project Structure

```
kensan-mockup/
├── src/                  # React/TypeScript frontend
├── backend/              # Go microservices
│   ├── services/         # Individual service implementations
│   ├── shared/           # Shared middleware, auth, errors
│   └── migrations/       # Database migrations
├── kensan-ai/            # Python AI service (FastAPI + Gemini)
├── lakehouse/            # Data pipeline (Dagster + Iceberg)
├── observability/        # Monitoring config (Grafana, Prometheus)
├── docs/                 # Documentation
│   ├── spec/             # API specifications
│   ├── adr/              # Architecture Decision Records
│   ├── guides/           # Setup & development guides
│   └── design/           # Brand guidelines & logos
├── e2e/                  # Playwright end-to-end tests
├── k8s/                  # Kubernetes manifests
├── docker-compose.yml    # Local development orchestration
└── ARCHITECTURE.md       # Overall architecture documentation
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes | - | Google GenAI API key for Gemini |
| `AI_PROVIDER` | No | `google` | AI provider |
| `GOOGLE_MODEL` | No | `gemini-2.0-flash` | Gemini model |
| `JWT_SECRET` | Production | `dev-secret-key-...` | JWT signing key |
| `DB_PASSWORD` | No | `kensan` | PostgreSQL password |

See `.env.example` for the full list.

---

## License

This project is part of a hackathon submission. All rights reserved.
