# HomeScout AI

Portfolio project: an AI home finder (concierge agent, similar units, buyer preferences) on a simple stack.
**Not production.** Skip auth, RLS, rate limits and deploy hardening unless an issue asks for them.

## Plan and progress
- The roadmap, decisions and progress live in **GitHub issue #12**. Read it before starting work.
- One sub-issue per branch/PR; the PR body says `Closes #N`. Tick the box in #12 when it merges.
- Record new design decisions in #12, not in code comments.

## Stack
```
Next.js 13 (frontend/) ──GraphQL──▶ NestJS (backend/) ──▶ Postgres 16 + pgvector  (source of truth)
                                         ├──────────────▶ Typesense             (search projection)
                                         └──────────────▶ MinIO / S3            (images)
```
`docker compose up --build` runs all 5 services locally.

## Commands
| Where | Command | Purpose |
|---|---|---|
| backend | `npm run lint` · `npm run typecheck` · `npm run test:e2e` | Checks (CI runs these) |
| backend | `npm run db:seed` | Apply migrations, seed if empty |
| backend | `npm run db:migrate` / `db:migrate:revert` | Migrations |
| backend | `npm run typesense:populate` | Rebuild search index |
| backend | `npm run start:dev` | API on :3001 (`/graphql`) |
| frontend | `npm run lint` · `npm run typecheck` · `npm run build` | Checks (CI runs these) |
| frontend | `npm run dev` | App on :3000 |

Run lint, typecheck and tests for every app you touched before pushing.

## Conventions
- Schema changes go in a new TypeORM migration (`backend/src/migrations/`); never edit an applied one.
- Postgres is the source of truth; Typesense is derived from it and must be rebuildable.
- Backend formatting is Prettier (`npm run lint:fix`). No comments unless the reason is non-obvious.
- Keep PRs focused on one issue. Don't widen scope.

## Cloud sessions
There is no Docker daemon. `.claude/hooks/session-start.sh` installs dependencies and starts
Postgres 16 + pgvector on `localhost:5432` (user/password/db `homescout`) with seed data, so the
backend's default config works without a `.env`. Typesense and MinIO are not available in cloud
sessions; the API still starts without them.
