import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import { parseTrialBalance, isSupportedFilename } from "@/lib/tb-parser";
import { computeVariances, stubCommentary } from "@/lib/variance";
import { periodToLabel, slugToPeriod, lineLabel } from "@/lib/format";
import type { AccountMapRow, BudgetLine, Commentary } from "@/lib/types";

export const runtime = "nodejs";

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return (
    "sha256:" +
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();

  // ── 1. Read the multipart payload ─────────────────────────────────────────
  let file: File | null = null;
  let companyId = "";
  let periodInput = "";
  try {
    const form = await req.formData();
    file = form.get("file") as File | null;
    companyId = String(form.get("company_id") ?? "");
    periodInput = String(form.get("period") ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  if (!file || typeof file.name !== "string") {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }
  if (!companyId || !periodInput) {
    return NextResponse.json(
      { error: "Company and period are required." },
      { status: 400 },
    );
  }
  const period = slugToPeriod(periodInput); // normalise to YYYY-MM-01
  const filename = file.name;
  const buffer = await file.arrayBuffer();
  const checksum = await sha256Hex(buffer);

  // ── 2. Concurrency guard (test plan) ───────────────────────────────────────
  const { data: inflight } = await supabase
    .from("ingest_logs")
    .select("id")
    .eq("company_id", companyId)
    .eq("period", period)
    .in("status", ["pending", "processing"])
    .limit(1);
  if (inflight && inflight.length > 0) {
    return NextResponse.json(
      {
        error: `An ingest for ${periodToLabel(period)} is already in progress. Wait for it to complete or contact finance admin.`,
      },
      { status: 409 },
    );
  }

  // ── 3. Open the ingest log (processing) ────────────────────────────────────
  const { data: log, error: logErr } = await supabase
    .from("ingest_logs")
    .insert({
      company_id: companyId,
      filename,
      period,
      checksum,
      status: "processing",
    })
    .select()
    .single();
  if (logErr || !log) {
    return NextResponse.json(
      { error: `Could not open ingest log: ${logErr?.message}` },
      { status: 500 },
    );
  }

  // Helper to mark the log failed + audit + respond.
  const fail = async (message: string, code = 400) => {
    await supabase
      .from("ingest_logs")
      .update({ status: "failed", error_message: message })
      .eq("id", log.id);
    await writeAudit(supabase, {
      action: "file_ingest_failed",
      object_type: "ingest_log",
      object_id: log.id,
      detail: { filename, period, error: message },
    });
    return NextResponse.json({ error: message, ingest_log_id: log.id }, { status: code });
  };

  try {
    // ── 4. Validate + parse ──────────────────────────────────────────────────
    if (!isSupportedFilename(filename)) {
      return await fail("Unsupported file type. Please upload a CSV or XLSX file.");
    }
    const parsed = await parseTrialBalance({ filename, buffer });
    if (parsed.error) return await fail(parsed.error);
    if (parsed.rows.length === 0) return await fail("The file contained no usable rows.");

    // ── 5. Load mapping, budget, materiality ──────────────────────────────────
    const [{ data: company }, { data: accountMap }, { data: budget }] = await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).single(),
      supabase.from("account_map").select("*").eq("company_id", companyId),
      supabase.from("budget_lines").select("*").eq("company_id", companyId).eq("period", period),
    ]);
    if (!company) return await fail("Company not found.", 404);

    const engine = computeVariances({
      parsedRows: parsed.rows,
      accountMap: (accountMap ?? []) as AccountMapRow[],
      budgetLines: (budget ?? []) as BudgetLine[],
      materialityThreshold: Number(company.materiality_threshold),
    });

    // ── 6. Preserve any existing commentary text (by display label) ───────────
    const { data: priorComments } = await supabase
      .from("commentaries")
      .select("*")
      .eq("company_id", companyId)
      .eq("period", period);
    const preserved = new Map<string, Commentary>();
    for (const c of (priorComments ?? []) as Commentary[]) {
      preserved.set(c.management_line, c);
    }

    // ── 7. Idempotent regenerate: clear prior derived rows for this period ─────
    const priorIds = (priorComments ?? []).map((c) => c.id);
    if (priorIds.length > 0) {
      await supabase.from("commentary_edits").delete().in("commentary_id", priorIds);
    }
    await supabase.from("commentaries").delete().eq("company_id", companyId).eq("period", period);
    await supabase.from("variance_lines").delete().eq("company_id", companyId).eq("period", period);
    await supabase.from("actuals").delete().eq("company_id", companyId).eq("period", period);

    // ── 8. Write actuals (raw audit of the file) ──────────────────────────────
    if (engine.actuals.length > 0) {
      const { error } = await supabase.from("actuals").insert(
        engine.actuals.map((a) => ({
          company_id: companyId,
          ingest_log_id: log.id,
          period,
          raw_account_code: a.raw_account_code,
          raw_account_name: a.raw_account_name,
          amount: a.amount,
        })),
      );
      if (error) throw error;
    }

    // ── 9. Write variance lines, capture ids ──────────────────────────────────
    const { data: insertedVar, error: varErr } = await supabase
      .from("variance_lines")
      .insert(
        engine.variances.map((v) => ({
          company_id: companyId,
          period,
          management_line: v.management_line,
          segment: v.segment,
          actual_amount: v.actual_amount,
          budget_amount: v.budget_amount,
          variance_amount: v.variance_amount,
          variance_pct: v.variance_pct,
          is_flagged: v.is_flagged,
          review_status: v.review_status,
        })),
      )
      .select();
    if (varErr) throw varErr;

    // ── 10. Stub / preserved commentary for flagged lines ─────────────────────
    const flagged = (insertedVar ?? []).filter((v) => v.is_flagged);
    if (flagged.length > 0) {
      const rows = flagged.map((v) => {
        const label = lineLabel(v);
        const prior = preserved.get(label);
        return {
          company_id: companyId,
          variance_line_id: v.id,
          period,
          management_line: label,
          commentary_text: prior?.commentary_text ?? stubCommentary(v),
          commentary_source: prior?.commentary_source ?? "draft",
          commentary_confidence: prior?.commentary_confidence ?? null,
          review_status: prior?.review_status ?? "unreviewed",
          owner_name: prior?.owner_name ?? null,
          is_published: false,
        };
      });
      const { error } = await supabase.from("commentaries").insert(rows);
      if (error) throw error;
    }

    // ── 11. Close the log + ensure a draft report exists ──────────────────────
    await supabase
      .from("ingest_logs")
      .update({ status: "processed", row_count: parsed.rows.length })
      .eq("id", log.id);

    const { data: existingReport } = await supabase
      .from("reports")
      .select("id,status")
      .eq("company_id", companyId)
      .eq("period", period)
      .maybeSingle();
    if (!existingReport) {
      await supabase.from("reports").insert({ company_id: companyId, period, status: "draft" });
    }

    await writeAudit(supabase, {
      action: "file_ingested",
      object_type: "ingest_log",
      object_id: log.id,
      detail: {
        filename,
        period,
        row_count: parsed.rows.length,
        variance_lines: insertedVar?.length ?? 0,
        flagged: flagged.length,
        unmapped_codes: engine.unmappedCodes,
        checksum,
      },
    });

    return NextResponse.json({
      ok: true,
      ingest_log_id: log.id,
      period,
      period_slug: periodInput,
      row_count: parsed.rows.length,
      variance_lines: insertedVar?.length ?? 0,
      flagged: flagged.length,
      unmapped_codes: engine.unmappedCodes,
      has_budget: engine.hasBudget,
    });
  } catch (e) {
    return await fail((e as Error).message, 500);
  }
}
