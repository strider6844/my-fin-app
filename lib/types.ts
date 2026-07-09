// Shared domain types — mirror the tables in supabase/migrations/0001_init.sql.

export type UUID = string;

export interface Company {
  id: UUID;
  user_id: UUID | null;
  name: string;
  materiality_threshold: number;
  created_at: string;
}

export interface AccountMapRow {
  id: UUID;
  user_id: UUID | null;
  company_id: UUID;
  raw_account_code: string;
  raw_account_name: string;
  management_line: string;
  segment: string | null;
  sign_convention: number; // 1 or -1
  created_at: string;
}

export interface BudgetLine {
  id: UUID;
  company_id: UUID;
  period: string; // YYYY-MM-DD (first of month)
  management_line: string;
  segment: string | null;
  amount: number; // signed, management presentation
}

export type IngestStatus = "pending" | "processing" | "processed" | "failed";

export interface IngestLog {
  id: UUID;
  company_id: UUID;
  filename: string;
  period: string;
  ingested_at: string;
  checksum: string;
  status: IngestStatus;
  row_count: number | null;
  error_message: string | null;
}

export interface ActualRow {
  id: UUID;
  company_id: UUID;
  ingest_log_id: UUID;
  period: string;
  raw_account_code: string;
  raw_account_name: string;
  amount: number;
}

export type ReviewStatus = "unreviewed" | "reviewed" | "cleared";

export interface VarianceLine {
  id: UUID;
  company_id: UUID;
  period: string;
  management_line: string;
  segment: string | null;
  actual_amount: number;
  budget_amount: number;
  variance_amount: number;
  variance_pct: number | null;
  is_flagged: boolean;
  review_status: ReviewStatus;
}

export type CommentarySource = "draft" | "finance_draft" | "llm_draft";

export interface Commentary {
  id: UUID;
  company_id: UUID;
  variance_line_id: UUID;
  period: string;
  management_line: string;
  commentary_text: string;
  commentary_source: CommentarySource;
  commentary_confidence: number | null;
  review_status: "unreviewed" | "reviewed";
  owner_name: string | null;
  is_published: boolean;
}

export interface CommentaryEdit {
  id: UUID;
  commentary_id: UUID;
  previous_text: string;
  new_text: string;
  edited_by: string | null;
  edited_at: string;
}

export type ReportStatus = "draft" | "submitted" | "published";

export interface Report {
  id: UUID;
  company_id: UUID;
  period: string;
  status: ReportStatus;
  published_at: string | null;
  published_by: string | null;
  snapshot_json: unknown | null;
  created_at: string;
}

export interface AuditLog {
  id: UUID;
  user_id: UUID | null;
  action: string;
  object_type: string;
  object_id: UUID | null;
  detail: unknown | null;
  performed_by: string | null;
  created_at: string;
}
