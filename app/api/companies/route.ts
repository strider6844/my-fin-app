import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// Create a company (an FP&A reporting entity) with its materiality threshold.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const threshold = Number(body.materiality_threshold);
    if (!name) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .insert({
        name,
        materiality_threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 5000,
      })
      .select()
      .single();
    if (error) throw error;

    await writeAudit(supabase, {
      action: "company_created",
      object_type: "company",
      object_id: data.id,
      detail: { name: data.name, materiality_threshold: data.materiality_threshold },
    });

    return NextResponse.json({ company: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
