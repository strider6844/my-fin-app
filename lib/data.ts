// Server-side read helpers. These run in Server Components and route handlers
// using the cookie-bound Supabase client (anon key; open RLS in v1).

import { createClient } from "@/lib/supabase/server";
import type {
  AccountMapRow,
  AuditLog,
  BudgetLine,
  Commentary,
  CommentaryEdit,
  Company,
  IngestLog,
  Report,
  VarianceLine,
} from "@/lib/types";

// A distinct management line + segment derived from the account map, with the
// polarity (income vs cost) of the accounts feeding it. Used to build budgets.
export interface MappingTarget {
  management_line: string;
  segment: string | null;
  polarity: number; // +1 income, -1 cost
}

export async function getCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getDefaultCompany(): Promise<Company | null> {
  const companies = await getCompanies();
  return companies[0] ?? null;
}

export async function getCompany(id: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAccountMap(companyId: string): Promise<AccountMapRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_map")
    .select("*")
    .eq("company_id", companyId)
    .order("raw_account_code", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getVarianceLines(
  companyId: string,
  period: string,
): Promise<VarianceLine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("variance_lines")
    .select("*")
    .eq("company_id", companyId)
    .eq("period", period);
  if (error) throw error;
  // flagged first, then largest absolute variance
  return (data ?? []).sort((a, b) => {
    if (a.is_flagged !== b.is_flagged) return a.is_flagged ? -1 : 1;
    return Math.abs(b.variance_amount) - Math.abs(a.variance_amount);
  });
}

export async function getCommentaries(
  companyId: string,
  period: string,
): Promise<Commentary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commentaries")
    .select("*")
    .eq("company_id", companyId)
    .eq("period", period);
  if (error) throw error;
  return data ?? [];
}

export async function getReport(
  companyId: string,
  period: string,
): Promise<Report | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("company_id", companyId)
    .eq("period", period)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getReports(companyId: string): Promise<Report[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("company_id", companyId)
    .order("period", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Published reports across all companies, newest first — the board-pack archive.
export async function getPublishedReports(): Promise<Report[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getReportById(id: string): Promise<Report | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getIngestLogs(companyId: string): Promise<IngestLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingest_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("ingested_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getBudgetLines(
  companyId: string,
  period: string,
): Promise<BudgetLine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_lines")
    .select("*")
    .eq("company_id", companyId)
    .eq("period", period);
  if (error) throw error;
  return data ?? [];
}

// Distinct (management_line, segment) targets from the account map, each with
// the polarity of its accounts, so the budget editor knows income vs cost.
export async function getMappingTargets(companyId: string): Promise<MappingTarget[]> {
  const rows = await getAccountMap(companyId);
  const map = new Map<string, MappingTarget>();
  for (const r of rows) {
    const key = `${r.management_line}||${r.segment ?? ""}`;
    if (!map.has(key)) {
      map.set(key, {
        management_line: r.management_line,
        segment: r.segment,
        polarity: Number(r.sign_convention) === -1 ? -1 : 1,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.management_line.localeCompare(b.management_line) ||
    (a.segment ?? "").localeCompare(b.segment ?? ""),
  );
}

// Distinct periods that have a budget, for the budget-editor period list.
export async function getBudgetPeriods(companyId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budget_lines")
    .select("period")
    .eq("company_id", companyId);
  if (error) throw error;
  const set = new Set((data ?? []).map((r) => r.period as string));
  return [...set].sort().reverse();
}

// Edit history for a set of commentaries, grouped by commentary_id (newest first).
export async function getCommentaryEdits(
  commentaryIds: string[],
): Promise<Record<string, CommentaryEdit[]>> {
  if (commentaryIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commentary_edits")
    .select("*")
    .in("commentary_id", commentaryIds)
    .order("edited_at", { ascending: false });
  if (error) throw error;
  const grouped: Record<string, CommentaryEdit[]> = {};
  for (const e of (data ?? []) as CommentaryEdit[]) {
    (grouped[e.commentary_id] ??= []).push(e);
  }
  return grouped;
}

// Distinct periods that have variance data, for building the report list.
export async function getPeriodsWithData(companyId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("variance_lines")
    .select("period")
    .eq("company_id", companyId);
  if (error) throw error;
  const set = new Set((data ?? []).map((r) => r.period as string));
  return [...set].sort().reverse();
}
