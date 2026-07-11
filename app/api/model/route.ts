import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveModelConfig, getModelConfig } from "@/lib/model-store";
import { SCENARIOS, type ModelConfig, type ScenarioName } from "@/lib/forecast";

// Save the driver config for a company (all scenarios at once).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyId = String(body.company_id ?? "");
    if (!companyId) {
      return NextResponse.json({ error: "company_id is required." }, { status: 400 });
    }

    // Start from the current config so a partial save doesn't drop fields.
    const current = await getModelConfig(companyId);
    const scenarios = { ...current.scenarios } as ModelConfig["scenarios"];
    const incoming = body.scenarios ?? {};
    for (const s of SCENARIOS) {
      if (incoming[s]) {
        const merged: Record<string, number> = { ...scenarios[s] };
        for (const [k, v] of Object.entries(incoming[s])) {
          const n = Number(v);
          if (Number.isFinite(n)) merged[k] = n;
        }
        scenarios[s as ScenarioName] = merged;
      }
    }

    const config: ModelConfig = {
      drivers: Array.isArray(body.drivers) && body.drivers.length ? body.drivers : current.drivers,
      scenarios,
    };

    const supabase = await createClient();
    await saveModelConfig(supabase, companyId, config, body.by ? String(body.by) : "Finance");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
