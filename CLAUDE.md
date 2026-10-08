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

## Code map
Start here instead of exploring. Pointers only; read the file for details.
Update this table in the same PR when you add, move or rename one of these places.

| To change… | Look in |
|---|---|
| DB schema | `backend/src/migrations/` (new file) + `backend/src/common/entities/` |
| Enums (property type, finishing, view, region) | `backend/src/common/enums/unit-attributes.ts` |
| Unit list / sort | `backend/src/modules/unit/` (`unit.service.ts` `findAllWithCount`, `dto/unit-filter.input.ts`) |
| Typesense schema + document mapping | `backend/src/common/typesense/typesense.service.ts` |
| Search (hybrid keyword + vector), free-text parsing | `backend/src/modules/search/` (`search.service.ts`, `query-parser.ts`) |
| Filters (one builder for SQL WHERE + Typesense `filter_by`) | `backend/src/modules/search/unit-filter.ts` |
| Embedding providers + unit embedding text | `backend/src/modules/embedding/` (`EMBEDDING_MODEL`) |
| Sync worker (pg-boss: embed + Typesense) | `backend/src/modules/sync/`; enqueue happens in `unit.service.ts` transactions |
| Similar units | `match_similar_units` in `migrations/1760100000000-UnitEmbeddings.ts`, `unit.service.ts` `findSimilarUnits` |
| Sample data | `backend/src/scripts/seed/` (`data.ts` catalog, `rules.ts`, `generate.ts`); entry `scripts/seed.ts` |
| Image uploads | `backend/src/modules/upload/` |
| Backend tests | unit: `src/**/*.spec.ts` (`npm test`); API: `test/**/*.e2e-spec.ts` (mocked services) |
| Home page listing + filters UI | `frontend/src/app/(home)/_components/` (`UnitFilters.tsx`, `UnitListing.tsx`) |
| Unit page | `frontend/src/app/(home)/unit/[id]/` |
| Dashboard (CRUD forms) | `frontend/src/app/dashboard/` |
| GraphQL queries, types, zod schemas | `frontend/src/lib/graphql/<entity>/` |

## Commands
| Where | Command | Purpose |
|---|---|---|
| backend | `npm run lint` · `npm run typecheck` · `npm test` · `npm run test:e2e` | Checks (CI runs these) |
| backend | `npm run db:seed` | Apply migrations, seed if empty (`-- --reset` to replace data) |
| backend | `npm run db:migrate` / `db:migrate:revert` | Migrations |
| backend | `npm run reindex` (`-- --if-needed`) | Enqueue every unit: re-embed if changed + rebuild search index |
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
sessions; the API still starts without them (sync jobs keep retrying the Typesense step;
embeddings are still written to Postgres).
