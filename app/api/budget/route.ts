import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { slugToPeriod } from "@/lib/format";

// Bulk set the budget for one company + period. Replaces the whole period's
// budget with the submitted lines (add/edit/remove in one save). `amount` is
// the signed management value (income positive, cost negative) computed by the
// client from each line's polarity.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const companyId = String(body.company_id ?? "");
    const period = slugToPeriod(String(body.period ?? ""));
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (!companyId || !body.period) {
      return NextResponse.json(
        { error: "company_id and period are required." },
        { status: 400 },
      );
    }

    const rows = lines
      .filter((l: { management_line?: string }) => l.management_line)
      .map((l: { management_line: string; segment?: string; amount: unknown }) => ({
        company_id: companyId,
        period,
        management_line: String(l.management_line).trim(),
        segment: l.segment ? String(l.segment).trim() : null,
        amount: Number(l.amount) || 0,
      }));

    const supabase = await createClient();
    // Replace the period's budget atomically-ish: clear then insert.
    await supabase.from("budget_lines").delete().eq("company_id", companyId).eq("period", period);
    if (rows.length > 0) {
      const { error } = await supabase.from("budget_lines").insert(rows);
      if (error) throw error;
    }

    await writeAudit(supabase, {
      action: "budget_updated",
      object_type: "budget_lines",
      object_id: null,
      detail: { period, line_count: rows.length },
    });

    return NextResponse.json({ ok: true, line_count: rows.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
