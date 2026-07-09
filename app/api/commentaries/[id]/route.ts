import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

// Edit a commentary. Records the prior text in commentary_edits (version
// history) and writes an audit row. Refuses edits once the report is published.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const newText = typeof body.commentary_text === "string" ? body.commentary_text.trim() : "";
    const editedBy = body.edited_by ? String(body.edited_by) : "Finance";
    const reviewStatus = body.review_status as string | undefined;

    if (!newText) {
      return NextResponse.json(
        { error: "Commentary text cannot be empty." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: current, error: readErr } = await supabase
      .from("commentaries")
      .select("*")
      .eq("id", id)
      .single();
    if (readErr || !current) {
      return NextResponse.json({ error: "Commentary not found." }, { status: 404 });
    }

    // Guard: don't allow editing commentary on a published report.
    const { data: report } = await supabase
      .from("reports")
      .select("status")
      .eq("company_id", current.company_id)
      .eq("period", current.period)
      .maybeSingle();
    if (report?.status === "published") {
      return NextResponse.json(
        { error: "This report is published and read-only. Revert it to draft to edit." },
        { status: 409 },
      );
    }

    const textChanged = newText !== current.commentary_text;

    const { data: updated, error: updErr } = await supabase
      .from("commentaries")
      .update({
        commentary_text: newText,
        commentary_source: "finance_draft",
        review_status: reviewStatus ?? current.review_status,
        owner_name: current.owner_name ?? editedBy,
      })
      .eq("id", id)
      .select()
      .single();
    if (updErr) throw updErr;

    if (textChanged) {
      const { error: editErr } = await supabase.from("commentary_edits").insert({
        commentary_id: id,
        previous_text: current.commentary_text,
        new_text: newText,
        edited_by: editedBy,
      });
      if (editErr) throw editErr;

      await writeAudit(supabase, {
        action: "commentary_edited",
        object_type: "commentary",
        object_id: id,
        performed_by: editedBy,
        detail: {
          management_line: current.management_line,
          period: current.period,
          previous_len: current.commentary_text.length,
          new_len: newText.length,
        },
      });
    }

    return NextResponse.json({ commentary: updated, recorded: textChanged });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
