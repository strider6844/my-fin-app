# Test Plan — my-fin-app

## v1 Success Scenario (manual walkthrough)

### Setup
1. Apply migration SQL; confirm 6 `variance_lines` and 3 `commentaries` exist for period 2025-03.
2. Open the app at `/` anonymously — confirm the Management P&L page loads with seed data (no login prompt).

### Ingest
3. Navigate to `/ingest`.
4. Select company "Acme Group Ltd", period "March 2025", upload `TB_Acme_Mar2025.csv`.
5. Click **Generate Report**.
6. **Pass:** `/ingest-log` shows a new row — filename matches, status = processed, checksum populated, row_count > 0.
7. **Pass:** `/report/2025-03` loads within 60 seconds and shows 6 management lines.

### Variance Flags
8. Confirm lines with |variance| ≥ £5,000 are marked with a red "Flagged" badge.
9. "Revenue – Product" (-£19k), "Cost of Sales" (-£18k), "Sales & Marketing" (-£7.5k) are flagged.
10. "Personnel Costs" (-£2.5k) is NOT flagged.

### Commentary Edit
11. Click the commentary for "Revenue – Product".
12. Change text to "Two enterprise deals slipped to April — confirmed by sales director."
13. Click **Save**.
14. **Pass:** Text updates immediately in the UI.
15. Click **Edit History** — previous text appears with timestamp.
16. Refresh page — edited text persists (not a local state update only).

### Publish
17. Click **Publish Report**.
18. **Pass:** Status badge changes to "Published". `published_at` timestamp visible.
19. Open the same URL in a new incognito browser tab.
20. **Pass:** Report is visible and read-only (no edit controls shown).

### Audit Log
21. Query `audit_logs` table directly (Supabase dashboard).
22. **Pass:** Rows exist for `file_ingested`, `commentary_edited`, `report_published` — each with correct `object_id` and `detail`.

---

## Empty / Error Cases

| Scenario | Expected behaviour |
|---|---|
| `/report/2024-01` (no data for period) | Empty state: "No report for this period. Upload a trial balance to get started." |
| Upload a non-CSV/XLSX file | Error banner: "Unsupported file type. Please upload a CSV or XLSX file." `ingest_log.status = failed`. |
| Upload a CSV missing account codes that aren't in `account_map` | Warning banner lists unmapped codes; mapped lines still computed; ingest_log notes unmapped count. |
| Network drop mid-edit | Unsaved changes indicator; retry button; no partial write to DB. |
| Ingest while another ingest is processing for the same period | Error: "An ingest for March 2025 is already in progress. Wait for it to complete or contact finance admin." |
| Budget lines missing for a period | Variance engine skips flagging; report shows actuals only with a warning: "No budget loaded for this period — variances cannot be computed." |
