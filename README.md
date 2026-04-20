# JobScout AI

JobScout is a Next.js 16 app that scans job boards, enriches listings with LLM metadata, and lets users triage results (new/saved/all) with BYOK support for Serper + Gemini.

## Core Features

- Multi-board search across Greenhouse, Lever, LinkedIn, Ashby, Workday, and more.
- Query-specific sync by role + location.
- BYOK support through browser-supplied headers.
- LLM enrichment for company stage/industry/summary.
- Persisted job interactions (save, dismiss, applied, interviewing).

## Required Environment Variables

Create a `.env.local` file:

```bash
DATABASE_URL=postgres://...
SERPER_API_KEY=...
GEMINI_API_KEY=...
CRON_SECRET=optional-secret-for-sync-endpoint
SEARCH_LOOKBACK_DAYS=14
```

> `CRON_SECRET` is optional but strongly recommended in deployed environments.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## API Endpoints

- `GET /api/health` – runtime + dependency health.
- `GET /api/jobs?userId=...&view=new|saved|all` – fetch jobs.
- `POST /api/jobs` – update interaction status.
- `POST /api/cron/sync` – run sync scan with payload `{ role, location, customSites }`.

## Deployment

- Deploy to Vercel.
- Set env vars in project settings.
- Optional cron: trigger `GET /api/cron/sync?token=...` or `POST /api/cron/sync` with `x-cron-secret` header.

## Notes

- Google fonts are loaded via `next/font/google`; if your build environment blocks `fonts.googleapis.com`, build may fail unless fonts are self-hosted.
