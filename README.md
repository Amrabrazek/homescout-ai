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
npm run start:dev            # API + sync worker; embeds and indexes new units
npm run reindex              # (new terminal, first run) enqueue every unit for embedding + indexing

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
| backend  | `npm run db:seed -- --reset`  | Replace all data with fresh sample data       |
| backend  | `npm run reindex`             | Enqueue every unit: re-embed if changed, rebuild the Typesense index |
| backend  | `npm run lint` / `typecheck`  | Static checks                                 |
| backend  | `npm test` / `test:e2e`       | Unit tests / API tests                        |
| frontend | `npm run lint` / `typecheck`  | Static checks                                 |

CI runs lint, typecheck, tests and a production build on every pull request.

## Project structure

```txt
backend/
  src/
    config/                database config shared by the app and migration CLI
    migrations/            versioned schema migrations (TypeORM)
    common/                entities, Typesense client
    modules/               developer, project, unit, amenity, image, upload,
                           embedding (providers), sync (pg-boss worker), search (hybrid search + filters)
    scripts/               seed generator (scripts/seed/) + reindex
frontend/
  src/app/                 App Router pages (listing, unit detail, dashboard)
  src/components/          UI components
  src/lib/                 Apollo client, GraphQL operations, storage helper
docker-compose.yml         the full local stack
```

API references: `backend/API_DOCUMENTATION.md`, `backend/API_QUICK_REFERENCE.md`,
`backend/GRAPHQL_PLAYGROUND_EXAMPLES.md`.

## AI features today

- **Embeddings**: pluggable via `EMBEDDING_MODEL`: `local-e5-small` (free, runs in Node, the default) or
  `openai-text-embedding-3-small` (needs `OPENAI_API_KEY`). Vectors live in Postgres (`unit_embeddings`);
  several models can coexist. After switching, run `npm run reindex`.
- **Sync**: creating, editing or deleting a unit enqueues a job (pg-boss) in the same transaction. A worker
  in the API process re-embeds the unit when its text changed and updates Typesense, retrying with backoff
  if Typesense is down. Set `WORKER=false` to run the API without it.
- **Search**: one hybrid search, typo-tolerant keyword plus vector, with filters. Free text such as
  "New Ciaro 3 bedroms under 8M" is parsed into hard filters (area, rooms, price) first.
- **Similar units**: nearest neighbours of a unit's embedding (pgvector, or Typesense for `searchSimilarUnits`).

## Roadmap

1. Realistic, diverse sample data (areas, property types, payment plans) and richer filters
2. Pluggable embeddings (free local model or OpenAI) with a reliable sync worker and hybrid search
3. Buyer profile: preferences + views, saves and skips
4. Concierge chat agent that searches real units and explains why they fit
5. Personalized "For you" feed with match scores
6. Evals, tracing and a model comparison report
