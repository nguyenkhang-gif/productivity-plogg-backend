# Commands

- `npm run start:dev` | `npm run build` | `npx tsc --noEmit -p tsconfig.json`
- `npx jest` (unit, `src/**/*.spec.ts`); single file: `npx jest src/modules/identity/auth/application/refresh-token.use-case.spec.ts`. `src/app.controller.spec.ts` is a known pre-existing failure.
- `POSTGRES_URL=... npm run test:integration` (real Postgres; refuses to run without `POSTGRES_URL`)
- `npm run lint:arch` (dependency-cruiser module boundaries, `.dependency-cruiser.cjs`) and `npx eslint "src/**/*.ts"`
- Prisma: `npm run prisma:generate` (client in `generated/prisma`), `npm run prisma:migrate`

# Architecture

NestJS 11 modular monolith. MongoDB (Mongoose) holds users, posts and most social/productivity data; PostgreSQL (Prisma 7, schema in `prisma/schema/*.prisma`) holds the guild system. They are linked only by string `userId`. Redis backs sessions, cache and the Socket.IO adapter.

```
src/shared/      config, database (Prisma), cache, realtime (Socket.IO Redis adapter), security (JWT/roles guards, throttler), http (pagination, regex escape, image type detection)
src/modules/<module>/<feature>/{domain,application,infrastructure,presentation}
  identity     auth (JWT access 15m + Redis refresh sessions, OAuth), user
  social       post, comment, reaction, share, bookmark, tag, category, friendship
  community    guild, guild-member, channel, role, invite, message, realtime (Discord-like, Postgres)
  media        storage (local disk / Cloudinary / Supabase)
  productivity focus, vault
  labs         ai, epub, story-context, translation-context, drive, mail (admin-only or experimental)
```

Rules (enforced by `npm run lint:arch`):
- Import another module only through `src/modules/<module>/index.ts`; `src/shared` never imports from `src/modules`.
- `domain/` stays framework-free (no Nest, Mongoose, Prisma). Repositories are interfaces + DI tokens in `domain/`, implemented in `infrastructure/`.
- Use-cases in `application/` hold authorization checks (ownership, visibility, guild permission bitmask + role hierarchy in `community/role/application/role-hierarchy.ts`); controllers only extract `req.user` and call use-cases.
- New HTTP list endpoints clamp pagination with `clampPagination` (`src/shared/http/pagination.ts`); user text used in Mongo `$regex` goes through `escapeRegex`; uploads go through `requireImageType`.
- WebSocket handlers validate payload DTOs and must check permissions before `client.join` and emit to rooms derived from DB data, never client-supplied ids.

# Mongo → Postgres migration

- `DATA_BACKEND=mongo|postgres` (default `mongo`, validated in `src/shared/config/env.validation.ts`) selects the implementation behind each migrated repository token. Both implementations stay wired; the Mongo connection is still required.
- `backendProvider<Iface>(TOKEN, MongoImpl, PrismaImpl)` (`src/shared/database/backend-provider.ts`) returns the provider; the module lists both concrete classes plus `PrismaModule`. Domain interfaces and callers do not change.
- Ids stay 24-hex ObjectId strings (`@id @db.VarChar(24)`; FKs also `VarChar(24)`); new rows use `newObjectId()` (`src/shared/database/object-id.ts`). User text in `contains` goes through `escapeLike` (`src/shared/database/like.ts`) because Prisma does not escape `%`/`_`.
- Schema: one file per module in `prisma/schema/<module>.prisma`, `@@map` snake_case plural tables, camelCase columns, `createdAt`/`updatedAt`. Migrations: `SHADOW_POSTGRES_URL=... POSTGRES_URL=... npx prisma migrate dev --name <name>`.
- Contract tests: `test/contracts/<x>-repository.contract.ts` export a `describe...Contract(name, factory)`; Prisma implementation runs it from `test/integration/<x>.prisma.repository.spec.ts`. Cross-module reads a repository needs (e.g. `UserRelations`) are ports backed by Mongo until their owner migrates; swap the binding then.
- Data migration: `npm run migrate:mongo-to-pg -- [--only=users,posts] [--dry-run] [--batch=500]` (`src/scripts/migrate-mongo-to-postgres/`). Add a `migrators/<x>.migrator.ts` + `.spec.ts` and register it in `registry.ts`; `dependsOn` sets the order. Writes are per-row upserts in one transaction per batch (idempotent re-runs).
- Per-module checklist: schema → migration → Prisma repository → `backendProvider` → contract test → migrator + transform tests. Then list remaining direct Mongo model usages.
- Status `labs`: epub, story-context, translation-context and mail-log are ported (`prisma/schema/labs.prisma`, `Prisma*Repository`, migrators `epubs`/`story-contexts`/`translation-contexts`/`mail-logs`); `EpubService` now goes through `EPUB_REPOSITORY`. Orphan rows (owner missing in Postgres) are reported as failed with a reason by the migrators. Drive and ai have no repository (unchanged); the Mongoose schemas stay for the Mongo backend.

# graphify

This project has a code knowledge graph at `graphify-out/` (functions, classes, imports, call edges, communities). It is not committed: the SessionStart hook (`.claude/hooks/graphify-session-start.sh`) installs graphify in cloud sessions and builds or updates the graph with local AST parsing (no API key). Locally, install it with `pip install 'graphifyy[sql,mcp]'`.

Rules:
- When `graphify-out/graph.json` exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located.
- Use `graphify path "<A>" "<B>"` for relationships, `graphify explain "<symbol>"` for one symbol, `graphify affected "<path>::<symbol>"` for impact analysis before changing a function.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
- After modifying code, run `graphify update .` to keep the graph current (AST only, no API cost).
- Cross-repo (frontend + backend): build each repo's graph, then `graphify merge-graphs <be>/graphify-out/graph.json <fe>/graphify-out/graph.json --out graphify-out/merged-graph.json` and query with `--graph graphify-out/merged-graph.json`.
- `/graphify` invokes the skill in `.claude/skills/graphify/SKILL.md`.
