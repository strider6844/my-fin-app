// Single place that writes the audit trail. Every meaningful mutation
// (ingest, commentary edit, publish, mapping change) records a row here so the
// PRD's "audit log shows the ingest and edit" requirement holds.

import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeAudit(
  supabase: SupabaseClient,
  entry: {
    action: string;
    object_type: string;
    object_id?: string | null;
    detail?: unknown;
    performed_by?: string | null;
    user_id?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    action: entry.action,
    object_type: entry.object_type,
    object_id: entry.object_id ?? null,
    detail: entry.detail ?? null,
    performed_by: entry.performed_by ?? "demo",
    user_id: entry.user_id ?? null,
  });
  // Audit must never break the primary write; log and continue.
  if (error) console.error("audit write failed:", error.message);
}
