// Persistence for the model's driver config.
//
// The app's database is provisioned without DDL access from here, so rather than
// add a table we store the driver config as a versioned jsonb record in
// audit_logs (object_type = 'model_config', object_id = company). Each save is a
// new row; we read the latest. Code-level DEFAULT_CONFIG is used until a company
// saves its own. If a real `model_drivers` table is added later, only this file
// changes.

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CONFIG, type ModelConfig, SCENARIOS } from "@/lib/forecast";
import type { SupabaseClient } from "@supabase/supabase-js";

const OBJECT_TYPE = "model_config";

export async function getModelConfig(companyId: string): Promise<ModelConfig> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("detail, created_at, performed_by")
    .eq("object_type", OBJECT_TYPE)
    .eq("object_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.detail) return DEFAULT_CONFIG;

  const stored = data.detail as Partial<ModelConfig>;
  // Merge defensively so a partial/old blob still yields a usable config.
  const scenarios = { ...DEFAULT_CONFIG.scenarios };
  for (const s of SCENARIOS) {
    scenarios[s] = { ...DEFAULT_CONFIG.scenarios[s], ...(stored.scenarios?.[s] ?? {}) };
  }
  return {
    drivers: stored.drivers?.length ? stored.drivers : DEFAULT_CONFIG.drivers,
    scenarios,
    updated_at: (data.created_at as string) ?? null,
    updated_by: (data.performed_by as string) ?? null,
  };
}

export async function saveModelConfig(
  supabase: SupabaseClient,
  companyId: string,
  config: ModelConfig,
  updatedBy = "Finance",
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    action: "model_config_updated",
    object_type: OBJECT_TYPE,
    object_id: companyId,
    performed_by: updatedBy,
    detail: { drivers: config.drivers, scenarios: config.scenarios },
  });
  if (error) throw error;
}
