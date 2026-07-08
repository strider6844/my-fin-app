# Tasks & Sprints — my-fin-app

## Sprint 1 — Schema, Seed Data, Account Map CRUD
**Goal:** Database live, seed data visible, account map manageable.

- [ ] Apply migration SQL to Supabase (all tables, open RLS, seed rows)
- [ ] Scaffold Next.js project; configure Supabase client (env vars, server-only service key)
- [ ] `/account-map` page: table of mapping rows with Add / Edit / Delete — all persist to DB
- [ ] Five UI states on every page: loading skeleton, empty state with CTA, partial data, error banner, ready
- [ ] Verify seed data renders on first load with no login

**Definition of Done:** Open `/account-map` anonymously → seed rows appear; add a new row → it persists after page refresh; delete a row → it is gone.

---

## Sprint 2 — File Ingest Pipeline & Variance Engine ← core engine
**Goal:** The deterministic engine works end-to-end against real data.

- [ ] `/ingest` page: file upload form (CSV/XLSX), period selector, company selector
- [ ] `POST /api/ingest` route: receive file, compute SHA-256, write `ingest_log` (status: processing)
- [ ] TB parser: read rows, look up `account_map`, accumulate by management line, write `actuals`
- [ ] Variance engine: `SUM(actuals) - SUM(budget_lines)` per line, apply sign convention, write `variance_lines`, set `is_flagged`
- [ ] Write stub `commentaries` rows for flagged lines
- [ ] Set `ingest_log.status = processed`; create `report` row (status: draft)
- [ ] `/ingest-log` page: list all ingest events — filename, period, checksum, status, row count
- [ ] Error path: bad file format → `ingest_log.status = failed`, error message shown
- [ ] Write `audit_logs` row for every ingest

**Definition of Done:** Upload the demo `TB_Acme_Mar2025.csv` → ingest log shows processed → `variance_lines` table has 6 rows → flagged lines match materiality rule → no manual DB editing required.

---

## Sprint 3 — Management P&L View, Commentary Editor, Publish ← **v1 functional milestone**
**Goal:** Finance completes the full workflow: ingest → review → edit → publish.

- [ ] `/report/[period]` page: management P&L table — line, actual, budget, variance £, variance %, status badge
- [ ] Flagged lines highlighted (red badge); ordered by |variance| descending
- [ ] Commentary panel per flagged line: shows current text, owner, review status
- [ ] Inline edit: click commentary → textarea → Save → `PATCH /api/commentaries/:id` → `commentary_edits` row written
- [ ] Edit history drawer: shows previous versions with editor name and timestamp
- [ ] **Publish** button → `PATCH /api/reports/:id` → `status=published`, `published_at` set, snapshot written
- [ ] Published report view: read-only P&L with commentary visible at `/report/[period]` without editing controls
- [ ] All five UI states on every page
- [ ] Demo fully viewable without login

**Definition of Done (v1 success scenario):** Drop TB file → click Generate → P&L loads with variances — 3 lines flagged. Edit commentary on "Revenue – Product" → save → edit history shows prior text. Click Publish → status badge changes to Published. Open same URL in a new incognito tab → report is visible and read-only. Audit log has entries for ingest, edit, and publish.

---

## Sprint 4 — Lock It Down (Auth + Roles + RLS)
**Goal:** Real users, real data isolation. No financial data before this sprint.

- [ ] Enable Supabase Auth; invite-only signup flow
- [ ] `user_roles` table: user_id, role (finance / board)
- [ ] Replace open RLS policies with role-scoped policies on all tables
- [ ] Board users: read-only, published reports only
- [ ] Finance users: full edit + publish
- [ ] Redirect unauthenticated visitors to `/login`
- [ ] `user_id` populated on all writes
- [ ] Confirm no service-role key used in any client-side path

**Definition of Done:** Board-role user cannot reach `/ingest` or edit any commentary. Finance-role user can complete full workflow. Anonymous user is redirected to login.

---

## Sprint 5 — CFO Approval & Board-Pack Archive
**Goal:** Formal approval gate and versioned published reports.

- [ ] Finance submits report for approval → `status = submitted`; CFO notified (in-app banner)
- [ ] CFO approves → `status = published`; CFO rejects → status back to `draft` with note
- [ ] Board-pack archive page: list published reports by period, open any snapshot
- [ ] Snapshot stored as `reports.snapshot_json` at publish time

**Definition of Done:** Finance submits → CFO sees pending report → CFO approves → board sees published. Open prior month's archive → shows that month's numbers unchanged.

---

## Gantt (sprint → week)
| Sprint | Week |
|---|---|
| 1 — Schema + account map | W1 |
| 2 — Ingest + variance engine | W1–W2 |
| 3 — P&L view + commentary + publish (v1 ✓) | W2 |
| 4 — Auth + roles + lock-down | W3 |
| 5 — CFO approval + archive | W4 |
