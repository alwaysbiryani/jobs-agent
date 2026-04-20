# JobScout AI

JobScout is a Next.js 16 app that scans job boards, optionally enriches listings with LLM metadata, and lets users triage results (new/saved/all).

## Core Features

- Multi-board search across Greenhouse, Lever, LinkedIn, Ashby, Workday, and more.
- Query-specific sync by role + location.
- BYOK support via request headers.
- Optional Gemini enrichment for company stage/industry/summary.
- Persisted job interactions (save, dismiss, applied, interviewing).

## Environment Setup

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

### Required

- `DATABASE_URL` (Postgres/Neon only)
- `SERPER_API_KEY` (unless supplied per request via `x-serper-key`)

### Optional

- `GEMINI_API_KEY` (enrichment only)
- `CRON_SECRET` (recommended in deployed environments)
- `SEARCH_LOOKBACK_DAYS` (defaults to `14`)

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## API Endpoints

- `GET /api/health` – runtime + dependency health (`200` with `overall: ok|degraded`).
- `GET /api/jobs?userId=...&view=new|saved|all` – fetch jobs.
- `POST /api/jobs` – update interaction status.
- `GET /api/cron/sync` – cron-style sync trigger.
- `POST /api/cron/sync` – interactive or server-initiated sync.

## Sync Auth and Keys

### GET `/api/cron/sync`

When `CRON_SECRET` is set, auth is required in this order:

1. `Authorization: Bearer <CRON_SECRET>` (primary)
2. `x-cron-secret` (legacy)
3. `?token=<CRON_SECRET>` (legacy)

Legacy auth responses include `X-Auth-Deprecated: true`.

### POST `/api/cron/sync`

- Cron-authenticated calls may use server env keys.
- Non-cron calls must provide `x-serper-key`.
- `x-gemini-key` is optional; sync still runs without enrichment.

## Deployment

- Deploy to Vercel.
- Set env vars in project settings.
- Keep the cron path at `/api/cron/sync` (configured in `vercel.json`).
- If `CRON_SECRET` is configured, schedule invocations should send `Authorization: Bearer <CRON_SECRET>`.

## Notes

- DB errors are returned as `503` with `code: DEPENDENCY_DATABASE_UNAVAILABLE`.
- `error` remains in response payloads for backward compatibility.
- Google fonts are loaded via `next/font/google`; if your build environment blocks `fonts.googleapis.com`, build may fail unless fonts are self-hosted.
