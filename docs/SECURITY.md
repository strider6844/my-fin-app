# Security — my-fin-app

## Secret Handling
- `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` (later) live in Vercel environment variables only — never in client-side code or committed files
- File ingest API route runs server-side only; raw file bytes never sent to the frontend
- Checksums computed server-side before any storage write

## Permission Model (v1 open → lock-down sprint)
**v1 (demo):** RLS policies allow all reads and writes without login — seed data is visible to anyone. Suitable for internal demo only, no real financial data. 
**Lock-down sprint:**
- Supabase Auth enabled; invite-only signup
- `finance` role: can ingest, edit commentary, publish
- `board` role: read-only; sees only `status=published` reports
- RLS policies replaced: `auth.uid() = user_id` for writes; `auth.uid()` role check for board-gated rows
- No financial data goes into the app until lock-down sprint is complete and verified

## Approved-Tools Rule
Server API routes call only named, scoped Supabase client methods. No `eval`, no dynamic SQL concatenation, no `run_any`. Agent actions use the tool list in AGENTIC_LAYER.md — nothing outside it.

## Audit Principle
Every state-changing action writes an `audit_logs` row before returning a success response. If the audit write fails, the action is rolled back. The audit table is append-only — no update or delete policy on `audit_logs`.

## Stop and Get a Human
Any task involving deletion of ingested actuals, changes to published snapshots, payment or auth configuration, or a suspected data breach must stop and involve a human reviewer before proceeding.
