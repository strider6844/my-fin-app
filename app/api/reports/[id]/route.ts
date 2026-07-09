import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

type Action = "publish" | "submit" | "approve" | "reject" | "revert";

// Drives the report lifecycle. Publishing (or approving) freezes a snapshot of
// the P&L + commentary into reports.snapshot_json so the board-pack archive is
// immutable even if later periods are re-ingested.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body.action as Action;
    const by = body.by ? String(body.by) : "Finance";
    const note = body.note ? String(body.note) : null;

    const supabase = await createClient();
    const { data: report, error: readErr } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .single();
    if (readErr || !report) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const buildSnapshot = async () => {
      const [{ data: lines }, { data: comments }] = await Promise.all([
        supabase
          .from("variance_lines")
          .select("*")
          .eq("company_id", report.company_id)
          .eq("period", report.period),
        supabase
          .from("commentaries")
          .select("*")
          .eq("company_id", report.company_id)
          .eq("period", report.period),
      ]);
      return {
        period: report.period,
        frozen_at: new Date().toISOString(),
        variance_lines: lines ?? [],
        commentaries: comments ?? [],
      };
    };

    let update: Record<string, unknown> = {};
    let auditAction = "";

    switch (action) {
      case "submit": {
        if (report.status === "published") {
          return NextResponse.json(
            { error: "Report is already published." },
            { status: 409 },
          );
        }
        update = { status: "submitted" };
        auditAction = "report_submitted";
        break;
      }
      case "reject": {
        update = { status: "draft" };
        auditAction = "report_rejected";
        break;
      }
      case "publish":
      case "approve": {
        const snapshot = await buildSnapshot();
        update = {
          status: "published",
          published_at: new Date().toISOString(),
          published_by: by,
          snapshot_json: snapshot,
        };
        auditAction = action === "approve" ? "report_approved" : "report_published";
        // mark commentaries as published
        await supabase
          .from("commentaries")
          .update({ is_published: true })
          .eq("company_id", report.company_id)
          .eq("period", report.period);
        break;
      }
      case "revert": {
        update = { status: "draft", published_at: null, published_by: null };
        auditAction = "report_reverted";
        await supabase
          .from("commentaries")
          .update({ is_published: false })
          .eq("company_id", report.company_id)
          .eq("period", report.period);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const { data: updated, error: updErr } = await supabase
      .from("reports")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (updErr) throw updErr;

    await writeAudit(supabase, {
      action: auditAction,
      object_type: "report",
      object_id: id,
      performed_by: by,
      detail: { period: report.period, note },
    });

    return NextResponse.json({ report: updated });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
