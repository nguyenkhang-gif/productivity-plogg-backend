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

# graphify

This project has a code knowledge graph at `graphify-out/` (functions, classes, imports, call edges, communities). It is not committed: the SessionStart hook (`.claude/hooks/graphify-session-start.sh`) installs graphify in cloud sessions and builds or updates the graph with local AST parsing (no API key). Locally, install it with `pip install 'graphifyy[sql,mcp]'`.

Rules:
- When `graphify-out/graph.json` exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located.
- Use `graphify path "<A>" "<B>"` for relationships, `graphify explain "<symbol>"` for one symbol, `graphify affected "<path>::<symbol>"` for impact analysis before changing a function.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
- After modifying code, run `graphify update .` to keep the graph current (AST only, no API cost).
- Cross-repo (frontend + backend): build each repo's graph, then `graphify merge-graphs <be>/graphify-out/graph.json <fe>/graphify-out/graph.json --out graphify-out/merged-graph.json` and query with `--graph graphify-out/merged-graph.json`.
- `/graphify` invokes the skill in `.claude/skills/graphify/SKILL.md`.
