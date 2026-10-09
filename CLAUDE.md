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
`docker compose up --build` runs all 5 services locally. Node 24 (Active LTS), pinned in `.nvmrc`; Dockerfiles and `engines` must match it.

## Code map
Start here instead of exploring. Pointers only; read the file for details.
Update this table in the same PR when you add, move or rename one of these places.

| To change… | Look in |
|---|---|
| DB schema | `backend/src/migrations/` (new file) + `backend/src/common/entities/` |
| Enums (property type, finishing, view, region) | `backend/src/common/enums/unit-attributes.ts` |
| Unit list / sort | `backend/src/modules/unit/` (`unit.service.ts` `findAllWithCount`, `dto/unit-filter.input.ts`) |
| Typesense schema + document mapping | `backend/src/common/typesense/typesense.service.ts` |
| Search (hybrid keyword + vector), free-text parsing | `backend/src/modules/search/` (`search.service.ts`, `query-parser.ts`; `understandSearch` query shows what was parsed) |
| Filters (one builder for SQL WHERE + Typesense `filter_by`) | `backend/src/modules/search/unit-filter.ts` |
| Embedding providers + unit embedding text | `backend/src/modules/embedding/` (`EMBEDDING_MODEL`) |
| Sync worker (pg-boss: embed + Typesense) | `backend/src/modules/sync/`; enqueue happens in `unit.service.ts` transactions |
| Job queues (one shared pg-boss instance) | `backend/src/common/queue/pg-boss.service.ts` |
| Buyer profile, events, taste vector | `backend/src/modules/buyer/` (`buyer.service.ts`, `taste-vector.ts` math, `buyer-taste.worker.ts`); buyer comes from the `x-buyer-id` header |
| Similar units (filter tiers, rerank, reasons) | `backend/src/modules/unit/similar-units.ts`; candidate query in `unit.service.ts` `findSimilarUnits` |
| Sample data | `backend/src/scripts/seed/` (`data.ts` catalog, `rules.ts`, `generate.ts`); entry `scripts/seed.ts` |
| Concierge tool endpoints (`/internal/*` REST, name → filter resolution) | `backend/src/modules/concierge/` (`concierge.service.ts`, `vocabulary.ts`, `unit-card.ts`) |
| Image uploads | `backend/src/modules/upload/` |
| Backend tests | unit: `src/**/*.spec.ts` (`npm test`); API: `test/**/*.e2e-spec.ts` (mocked services) |
| Brand (colour tokens, font, logo, favicon) | `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, `frontend/src/components/brand/Logo.tsx`, `frontend/public/favicon.svg` |
| Home page (ask box, filter bar + sheet, listing, cards) | `frontend/src/app/(home)/_components/` (`AskHero.tsx`, `FilterBar.tsx`, `UnitFilters.tsx`, `UnitListing.tsx`, `UnitCard.tsx`) |
| Unit page | `frontend/src/app/(home)/unit/[id]/` |
| Dashboard (CRUD forms) | `frontend/src/app/dashboard/` |
| Buyer cookie (`hs_buyer`) and event API | `frontend/src/middleware.ts`, `frontend/src/app/api/events/route.ts`; server-side buyer calls in `frontend/src/lib/graphql/buyer/server.ts` |
| My preferences page | `frontend/src/app/(home)/preferences/` |
| Concierge agent (route, tools, prompt, model from `LLM_PROVIDER`/`LLM_MODEL`, Langfuse) | `frontend/src/app/api/chat/route.ts`, `frontend/src/lib/concierge/` |
| Concierge chat UI (floating panel, `/concierge`, tool-result cards) | `frontend/src/components/concierge/`, `frontend/src/app/(home)/concierge/` |
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
- pg-boss is ESM-only and Jest runs CommonJS, so both Jest configs map `pg-boss` to `backend/test/pg-boss.stub.ts`.
- Backend formatting is Prettier (`npm run lint:fix`). No comments unless the reason is non-obvious.
- Keep PRs focused on one issue. Don't widen scope.

## Cloud sessions
There is no Docker daemon. `.claude/hooks/session-start.sh` switches the session to the `.nvmrc` Node, installs dependencies and starts
Postgres 16 + pgvector on `localhost:5432` (user/password/db `homescout`) with seed data, so the
backend's default config works without a `.env`. Typesense and MinIO are not available in cloud
sessions; the API still starts without them (sync jobs keep retrying the Typesense step;
embeddings are still written to Postgres).
