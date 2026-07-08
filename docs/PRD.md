# PRD — my-fin-app

## Problem
FP&A teams build management reports in Excel: manual copy-paste from the accounting system, local file juggling, no audit trail, no version history on commentary. Every month restarts from scratch.

## Target User
FP&A analyst / finance manager. Job shifts from building the report to reviewing it. CFO approves in-app. Board reads in-app — always current, no Excel required.

## Core Objects
| Object | Purpose |
|---|---|
| **Account Map** | Maps raw TB account codes → management P&L lines/segments. Defined once per company. |
| **Actuals** | Parsed trial-balance rows for a period, linked to an ingest event. |
| **Budget Lines** | Plan amounts per management line per period — the variance benchmark. |
| **Variance Lines** | Computed actuals-vs-budget per line; flagged if material. Tracks review status. |
| **Commentary** | The "why" attached to each flagged line. Versioned, owned, publishable. |
| **Ingest Log** | Audit record of every file drop: filename, period, checksum, status. |
| **Report** | A period's assembled P&L + commentary, with publish status and snapshot. |

## MVP Checklist (v1 must-haves)
- [ ] Upload TB export → parsed → actuals stored → ingest log written
- [ ] Variance engine runs: actuals minus budget, material lines flagged
- [ ] Management P&L page loads with variances and draft commentary
- [ ] Finance edits a commentary inline → saves → edit history recorded
- [ ] One-click Publish → report status → published; CFO sees live view
- [ ] Ingest log page shows file, period, checksum, status
- [ ] No login wall for demo; seed data visible on first load

## Non-Goals (v1)
Accounting-system API connector; driver/assumption editing in-app; LLM-generated narrative; multi-entity consolidation; scenario planning; mobile app; granular permissions; real-time sync.

## Success Criterion
Finance drops `TB_Acme_Mar2025.csv` into the upload area, clicks **Generate Report**, the management P&L appears within 60 seconds with variances flagged and draft commentary. Finance edits one explanation, clicks **Publish**, and the CFO opens the same report and sees the updated text. No Excel opened, no local file juggled, audit log shows the ingest and edit.
