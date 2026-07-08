# Architecture — my-fin-app

## Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend / DB**: Supabase (Postgres + Storage + Auth)
- **Hosting**: Vercel
- **File parsing**: Server-side API route (Node) — CSV/XLSX → JSON

## What to Build Now vs Later
**Now (v1):** file upload → parse → variance engine → P&L view → inline edit → publish → audit log 
**Next:** Auth, roles, CFO approval step, board-pack archive 
**Later:** LLM commentary drafts, accounting-system connector, scenario planning

## Key User Action — Step-by-Step
1. Finance drops TB export via `/ingest` upload form
2. API route receives file, computes SHA-256 checksum, writes `ingest_log` row (status: processing)
3. Parser reads rows, looks up each `raw_account_code` in `account_map`, writes `actuals` rows
4. Variance engine: for each management line, `SUM(actuals) - SUM(budget_lines)` → writes `variance_lines`; flags rows where `|variance_amount| >= company.materiality_threshold`
5. Stub commentary rows written for flagged lines (source: `draft`, review_status: `unreviewed`)
6. `ingest_log` status → `processed`; `report` row created (status: `draft`)
7. Finance opens Management P&L page — reads `variance_lines` + `commentaries` — edits inline → `PATCH /commentaries/:id` → `commentary_edits` row written
8. Finance clicks Publish → `report.status = published`, `published_at` set → CFO reads same URL

## Layer Plan
1. **Data first** — schema + RLS + seed data; engine runs in SQL/server functions
2. **App logic** — API routes for ingest, variance compute, publish; CRUD for account map and commentary
3. **Smart features later** — LLM drafts slotted in at step 5 when switched on; engine unchanged

## Core Without AI
Variance engine is pure arithmetic (actuals minus budget). Commentary stubs are placeholder text. The AI layer only improves the draft text — nothing breaks if it is off.
