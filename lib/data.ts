// Server-side read helpers. These run in Server Components and route handlers
// using the cookie-bound Supabase client (anon key; open RLS in v1).

import { createClient } from "@/lib/supabase/server";
import type {
  AccountMapRow,
  AuditLog,
  Commentary,
  Company,
  IngestLog,
  Report,
  VarianceLine,
} from "@/lib/types";

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
