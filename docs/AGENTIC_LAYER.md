# Agentic Layer — my-fin-app

## Risk Classification

### Low — auto-execute, log only
- **flag_variance**: after compute, mark `variance_lines.is_flagged = true` where threshold exceeded
- **draft_commentary_stub**: write placeholder commentary row for each flagged line
- **write_ingest_log**: record filename, checksum, row count, status on every upload

### Medium — execute, then notify for review
- **recompute_variance**: re-run variance engine when a new ingest replaces a prior month → notifies finance that lines have changed
- **mark_commentary_reviewed**: auto-clear lines where finance has saved text (status → reviewed) — finance confirms in UI

### High — require explicit approval before action
- **publish_report**: finance clicks Publish → CFO sees an approval prompt → CFO confirms → `report.status = published` and snapshot written *(post-v1; v1 publish is one-click by finance)*
- **llm_draft_commentary**: LLM generates draft text → stored as `review_status=unreviewed` → finance must edit/approve before publish

### Critical — human-only, never automated
- Delete an ingest and its actuals (data loss risk — requires named human action + confirmation)
- Overwrite a published report snapshot
- Any action touching auth or billing

## Named Tools (v1)
| Tool | Trigger | Output |
|---|---|---|
| `ingest_tb_file` | File upload | `ingest_log` row + `actuals` rows |
| `compute_variances` | Post-ingest | `variance_lines` rows |
| `draft_stubs` | Post-compute | `commentaries` stub rows |
| `save_commentary` | Finance edit | `commentaries` update + `commentary_edits` row |
| `publish_report` | Finance publish | `reports.status=published` + snapshot |

## Audit Log Fields
`action`, `object_type`, `object_id`, `performed_by`, `detail` (JSON: before/after values), `created_at`

## v1 vs Later
**v1:** All medium/high actions triggered manually by finance. 
**Later:** LLM drafts on post-ingest trigger; CFO in-app approval gate before publish.
