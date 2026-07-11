import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// Amend a company's assumptions: its name and its materiality threshold (the
// £ level above which a variance is flagged for commentary).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      patch.name = name;
    }
    if (body.materiality_threshold !== undefined) {
      const t = Number(body.materiality_threshold);
      if (!Number.isFinite(t) || t <= 0) {
        return NextResponse.json(
          { error: "Materiality threshold must be a positive number." },
          { status: 400 },
        );
      }
      patch.materiality_threshold = t;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("companies")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await writeAudit(supabase, {
      action: "company_updated",
      object_type: "company",
      object_id: id,
      detail: patch,
    });

    return NextResponse.json({ company: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
