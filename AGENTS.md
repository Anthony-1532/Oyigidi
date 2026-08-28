<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Git workflow

- The single source of truth is the `main` branch on `origin`. Push with `git push origin main`.

# Architecture (ochetoha pattern)

- **Next.js App Router only** — pages in `app/`, REST API under `app/api/v1/**`.
- **In-memory store** (`lib/db/store.ts`) seeded from `data/*.ts`; state lives on
  `globalThis` so pages and route handlers share it. Restarts reset demo data.
- **Mock auth**: httpOnly `oy_role` cookie (client|coach|admin), verified
  server-side via `lib/auth/session.ts::requireRole` on every request.
- **No environment variables required.** Optional: `BUILT_IN_FORGE_API_URL` +
  `BUILT_IN_FORGE_API_KEY` switch coaching replies to a live LLM; without them
  the engine returns honest demo guidance.
- Quality gate: `npm run lint && npm run build`.
