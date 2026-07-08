# Intelligence Layer — my-fin-app

## Messy Input
Raw trial-balance CSV/XLSX: arbitrary account codes, inconsistent naming, no management-line mapping, signed/unsigned amounts varying by system.

## Auto-Structure (what the engine produces)
```json
{
  "period": "2025-03",
  "management_line": "Revenue – Product",
  "actual_amount": 231000,
  "budget_amount": 250000,
  "variance_amount": -19000,
  "variance_pct": -7.6,
  "is_flagged": true,
  "commentary_draft": "Product revenue £19k below budget. [Finance to complete reason.]",
  "commentary_source": "finance_draft",
  "commentary_confidence": null,
  "review_status": "unreviewed"
}
```

## Events to Track
- File ingested (filename, checksum, row count, success/failure)
- Variance computed (line, actual, budget, flag decision)
- Commentary edited (who, from, to, when)
- Report published (who, when, snapshot hash)

## Scoring Rules (v1 — rule-based, no model)
- `is_flagged = true` when `|variance_amount| >= company.materiality_threshold`
- `variance_pct` ranked descending — most material lines shown first
- `review_status` drives the red/amber/green badge on each line

## What Gets Ranked
Flagged variance lines, ordered by `|variance_amount|` descending — finance works top-to-bottom.

## v1 vs Later
**v1:** Rule-based flagging; stub commentary text ("[Finance to complete]" or prior-period text). 
**Later:** LLM reads the management line, variance direction/magnitude, and prior-period commentary → drafts a natural-language explanation stored with `source=llm_draft`, `confidence=0.7`, `review_status=unreviewed`. Finance confirms or edits before publish.
