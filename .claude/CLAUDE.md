# graphify

This project has a code knowledge graph at `graphify-out/` (functions, classes, imports, call edges, communities). It is not committed: the SessionStart hook (`.claude/hooks/graphify-session-start.sh`) installs graphify in cloud sessions and builds or updates the graph with local AST parsing (no API key). Locally, install it with `pip install 'graphifyy[sql,mcp]'`.

Rules:
- When `graphify-out/graph.json` exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located.
- Use `graphify path "<A>" "<B>"` for relationships, `graphify explain "<symbol>"` for one symbol, `graphify affected "<path>::<symbol>"` for impact analysis before changing a function.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review.
- After modifying code, run `graphify update .` to keep the graph current (AST only, no API cost).
- Cross-repo (frontend + backend): build each repo's graph, then `graphify merge-graphs <be>/graphify-out/graph.json <fe>/graphify-out/graph.json --out graphify-out/merged-graph.json` and query with `--graph graphify-out/merged-graph.json`.
- `/graphify` invokes the skill in `.claude/skills/graphify/SKILL.md`.
