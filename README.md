# HomeScout AI

An AI-powered home finder: browse and filter real units, get similar-unit recommendations from vector
embeddings, and (coming next) talk to a concierge agent that learns each buyer's preferences.

This repo is a portfolio project showing how AI fits into a real product workflow, built on a deliberately
simple, well-structured system.

## Architecture

```
Browser ──▶ Next.js (frontend :3000)
              │  GraphQL (pages, filters)       │  REST /uploads/images
              ▼                                 ▼
           NestJS API (backend :3001) ───────────────────────────────┐
              │ TypeORM                 │ index + search             │ S3 API
              ▼                         ▼                            ▼
      Postgres 16 + pgvector      Typesense (search)         MinIO (images bucket)
      source of truth             fuzzy + faceted search     public-read object URLs
```

| Service    | Port(s)     | Purpose                                              |
| ---------- | ----------- | ---------------------------------------------------- |
| frontend   | 3000        | Next.js app                                          |
| backend    | 3001        | GraphQL API (`/graphql`) and image uploads           |
| postgres   | 5432        | Data + vector embeddings (pgvector)                  |
| typesense  | 8108        | Fast, typo-tolerant search with facets               |
| minio      | 9000 / 9001 | S3-compatible image storage / web console            |

## Quick start

Requirements: Docker with Docker Compose.

```bash
git clone https://github.com/Amrabrazek/nawy-replica.git homescout-ai
cd homescout-ai
docker compose up --build
```

On first start the backend applies database migrations, seeds sample data, and indexes it into Typesense.
Then open:

- App: http://localhost:3000
- GraphQL playground: http://localhost:3001/graphql
- MinIO console: http://localhost:9001 (user `homescout`, password `homescout-secret`)

Every setting has a working local default. To override one, copy `.env.example` to `.env` and edit it.

**Reset everything** (database, search index, images):

```bash
docker compose down -v
```

## Local development (without Docker for the apps)

Run the infrastructure in Docker and the apps on your machine:

```bash
docker compose up postgres typesense minio minio-init

# backend
cd backend
cp .env.example .env
npm install
npm run db:seed              # apply migrations + seed if empty
npm run typesense:populate   # index units into Typesense
npm run start:dev

# frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Useful scripts

| Where    | Command                       | What it does                                  |
| -------- | ----------------------------- | --------------------------------------------- |
| backend  | `npm run db:migrate`          | Apply pending migrations                      |
| backend  | `npm run db:migrate:revert`   | Revert the last migration                     |
| backend  | `npm run db:seed`             | Migrate, then seed sample data if DB is empty |
| backend  | `npm run typesense:populate`  | Rebuild the Typesense index from the database |
| backend  | `npm run lint` / `typecheck`  | Static checks                                 |
| backend  | `npm run test:e2e`            | API tests                                     |
| frontend | `npm run lint` / `typecheck`  | Static checks                                 |

CI runs lint, typecheck, tests and a production build on every pull request.

## Project structure

```txt
backend/
  db/seed.sql              sample data
  src/
    config/                database config shared by the app and migration CLI
    migrations/            versioned schema migrations (TypeORM)
    common/                entities, events, Typesense client
    modules/               developer, project, unit, amenity, image, search, upload
    scripts/               seed + Typesense population
frontend/
  src/app/                 App Router pages (listing, unit detail, dashboard)
  src/components/          UI components
  src/lib/                 Apollo client, GraphQL operations, storage helper
docker-compose.yml         the full local stack
```

API references: `backend/API_DOCUMENTATION.md`, `backend/API_QUICK_REFERENCE.md`,
`backend/GRAPHQL_PLAYGROUND_EXAMPLES.md`.

## AI features today

- **Similar units**: units carry vector embeddings in Postgres (pgvector); the unit page shows the closest
  matches. With `OPENAI_API_KEY` set, new and edited units get OpenAI embeddings.
- **Search**: Typesense provides typo-tolerant, faceted search over units.

## Roadmap

1. Realistic, diverse sample data (areas, property types, payment plans) and richer filters
2. Pluggable embeddings (free local model or OpenAI) with a reliable sync worker and hybrid search
3. Buyer profile: preferences + views, saves and skips
4. Concierge chat agent that searches real units and explains why they fit
5. Personalized "For you" feed with match scores
6. Evals, tracing and a model comparison report
