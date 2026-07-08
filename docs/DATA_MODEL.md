# Data Model — my-fin-app

## companies
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable; owner at lock-down |
| name | text | |
| materiality_threshold | numeric | default 5000; flags variances above this |
| created_at | timestamptz | |

## account_map
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | nullable |
| company_id | uuid FK→companies | |
| raw_account_code | text | e.g. "4000" |
| raw_account_name | text | |
| management_line | text | e.g. "Revenue" |
| segment | text | e.g. "Product" |
| sign_convention | numeric | 1 or -1; flips cost accounts |

## budget_lines
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| period | date | first of month |
| management_line | text | |
| segment | text | |
| amount | numeric | signed |

## ingest_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| filename | text | |
| period | date | |
| ingested_at | timestamptz | |
| checksum | text | SHA-256 of raw file |
| status | text | pending / processing / processed / failed |
| row_count | integer | |
| error_message | text | nullable |

## actuals
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| ingest_log_id | uuid FK→ingest_logs | |
| period | date | |
| raw_account_code | text | |
| raw_account_name | text | |
| amount | numeric | |

## variance_lines
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| period | date | |
| management_line | text | |
| segment | text | |
| actual_amount | numeric | |
| budget_amount | numeric | |
| variance_amount | numeric | actual - budget |
| variance_pct | numeric | |
| is_flagged | boolean | true if |variance| ≥ threshold |
| review_status | text | unreviewed / reviewed / cleared |

## commentaries
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| variance_line_id | uuid FK→variance_lines | |
| period | date | |
| management_line | text | |
| commentary_text | text | **AI field: value** |
| commentary_source | text | **AI field: source** (finance_draft / llm_draft) |
| commentary_confidence | numeric | **AI field: confidence** 0–1 |
| review_status | text | **AI field: review_status** unreviewed / reviewed |
| owner_name | text | |
| is_published | boolean | |

## commentary_edits
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| commentary_id | uuid FK→commentaries | |
| previous_text | text | |
| new_text | text | |
| edited_by | text | |
| edited_at | timestamptz | |

## reports
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK | |
| period | date | |
| status | text | draft / submitted / published |
| published_at | timestamptz | |
| published_by | text | |
| snapshot_json | jsonb | full P&L snapshot at publish |

## audit_logs
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| action | text | e.g. file_ingested, commentary_edited, report_published |
| object_type | text | |
| object_id | uuid | |
| detail | jsonb | |
| performed_by | text | |

**RLS:** All tables have open v1 policies (select + all). Lock-down sprint replaces with `auth.uid() = user_id` owner policies.
