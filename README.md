# Oyigidi AI

A private, role-aware coaching workspace — built on the [ochetoha](../ochetoha) pattern: Next.js App Router, an in-memory seeded store, mock role sessions, and zero required environment variables. Clone it, run it, and everything works.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Quality gate:

```bash
npm run lint && npm run build
```

## How it works (demo boundaries)

| Layer | Implementation |
|---|---|
| Pages | `app/**` — server components read `lib/db/store.ts` directly |
| API | `app/api/v1/**` route handlers — consistent `{data,error,requestId}` envelope via `lib/api/http.ts` |
| Data | In-memory repository on `globalThis`, seeded from `data/seed.ts`. **A restart resets all state** — expected for a prototype; swap in a real database behind the same repo surface later |
| Auth | httpOnly `oy_role` cookie (`client` \| `coach` \| `admin`) chosen on the landing page; every request is re-verified server-side via `lib/auth/session.ts::requireRole`. UI hiding is never the security boundary |
| AI | `lib/coaching/engine.ts` calls a hosted LLM when `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY` are set; otherwise it returns honest, context-aware demo guidance so the product is fully explorable with no config |
| Safety | Self-harm escalation messages always short-circuit to a supportive safety response and flag the session for coach review |
| Security | CSP with per-request nonce + rate limiting in `proxy.ts`; body-size caps and per-endpoint buckets |

## Workspaces

- **Client** (`/client`) — Today, My journey (goal sliders), Coach chat, Learn (Development Compass assessment → insight + action items), Reflect (private journal)
- **Coach** (`/coach`) — Overview with real roster progress, Clients (assign/enroll), Programs (curriculum authoring with safety-boundary validation), Knowledge (chunked retrieval sources), Group sessions, AI review queue
- **Admin** (`/admin`) — Overview metrics + 7-day activity, People (provision/suspend + role changes), Audit log, Frameworks, plus audited privacy tools: full client data export and confirmed erasure

## Optional environment variables

| Variable | Purpose |
|---|---|
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | Switch coaching replies from demo guidance to a live LLM (server-side only) |
| `ERROR_WEBHOOK_URL` | Not used yet — reserved |

## Deployment

Any Node host works (`next build && next start`). On Vercel: import the repo, no environment variables needed.
