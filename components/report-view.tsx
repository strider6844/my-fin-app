"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Badge, Card, ErrorBanner, WarningBanner } from "@/components/ui";
import { PnlTable } from "@/components/pnl-table";
import { formatCurrency, formatDateTime, lineLabel, formatPct } from "@/lib/format";
import type {
  Commentary,
  CommentaryEdit,
  Report,
  ReportStatus,
  VarianceLine,
} from "@/lib/types";

function statusTone(s: ReportStatus) {
  return s === "published" ? "green" : s === "submitted" ? "amber" : "indigo";
}

export function ReportView({
  report,
  companyName,
  periodLabel,
  lines,
  commentaries,
  editsByCommentary,
  hasBudget,
}: {
  report: Report;
  companyName: string;
  periodLabel: string;
  lines: VarianceLine[];
  commentaries: Commentary[];
  editsByCommentary: Record<string, CommentaryEdit[]>;
  hasBudget: boolean;
}) {
  const router = useRouter();
  const readOnly = report.status === "published";
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const commentaryByVarianceId = new Map(
    commentaries.map((c) => [c.variance_line_id, c]),
  );
  const flagged = lines.filter((l) => l.is_flagged);

  async function reportAction(action: string) {
    setError(null);
    setPublishing(action);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, by: "Finance" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {companyName} — Management P&amp;L
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
            {periodLabel}
            <Badge tone={statusTone(report.status)}>
              {report.status[0].toUpperCase() + report.status.slice(1)}
            </Badge>
            {report.published_at && (
              <span>· published {formatDateTime(report.published_at)}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report.status === "draft" && (
            <>
              <Button
                variant="secondary"
                disabled={publishing !== null}
                onClick={() => reportAction("submit")}
              >
                {publishing === "submit" ? "Submitting…" : "Submit for approval"}
              </Button>
              <Button
                disabled={publishing !== null}
                onClick={() => reportAction("publish")}
              >
                {publishing === "publish" ? "Publishing…" : "Publish Report"}
              </Button>
            </>
          )}
          {report.status === "submitted" && (
            <>
              <Button
                variant="danger"
                disabled={publishing !== null}
                onClick={() => reportAction("reject")}
              >
                {publishing === "reject" ? "Rejecting…" : "Reject to draft"}
              </Button>
              <Button
                disabled={publishing !== null}
                onClick={() => reportAction("approve")}
              >
                {publishing === "approve" ? "Approving…" : "Approve & Publish"}
              </Button>
            </>
          )}
          {report.status === "published" && (
            <Button
              variant="secondary"
              disabled={publishing !== null}
              onClick={() => reportAction("revert")}
            >
              {publishing === "revert" ? "Reverting…" : "Revert to draft"}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {report.status === "submitted" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Pending CFO approval.</span> Finance has
          submitted this report. A CFO can approve &amp; publish it, or reject it
          back to draft.
        </div>
      )}

      {readOnly && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-semibold">Published &amp; read-only.</span> This is
          the board-ready view — commentary editing is locked. Revert to draft to
          make changes.
        </div>
      )}

      {!hasBudget && (
        <WarningBanner>
          No budget loaded for this period — variances cannot be computed. Actuals
          are shown as-is.
        </WarningBanner>
      )}

      <Card className="p-2 sm:p-4">
        <PnlTable
          lines={lines}
          selectedId={selectedId}
          onWhat={readOnly ? undefined : (id) => setSelectedId(id)}
        />
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Commentary{" "}
          <span className="text-sm font-normal text-[var(--muted)]">
            ({flagged.length} flagged line{flagged.length === 1 ? "" : "s"})
          </span>
        </h2>
        {flagged.length === 0 ? (
          <Card className="p-6 text-sm text-[var(--muted)]">
            No lines exceeded the materiality threshold — nothing to explain.
          </Card>
        ) : (
          <div className="space-y-3">
            {flagged.map((line) => {
              const c = commentaryByVarianceId.get(line.id);
              return (
                <CommentaryCard
                  key={line.id}
                  line={line}
                  commentary={c}
                  edits={c ? editsByCommentary[c.id] ?? [] : []}
                  readOnly={readOnly}
                  highlighted={selectedId === line.id}
                  onSaved={() => router.refresh()}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentaryCard({
  line,
  commentary,
  edits,
  readOnly,
  highlighted,
  onSaved,
}: {
  line: VarianceLine;
  commentary: Commentary | undefined;
  edits: CommentaryEdit[];
  readOnly: boolean;
  highlighted: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(commentary?.commentary_text ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function save() {
    if (!commentary) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/commentaries/${commentary.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentary_text: text,
          edited_by: "Finance",
          review_status: "reviewed",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setEditing(false);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const negative = Number(line.variance_amount) < 0;

  return (
    <Card
      className={`p-4 ${highlighted ? "ring-2 ring-indigo-300" : ""}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold">{lineLabel(line)}</span>
        <Badge tone="red">Flagged</Badge>
        <span
          className={`text-sm font-medium ${negative ? "text-red-600" : "text-emerald-600"}`}
        >
          {formatCurrency(Number(line.variance_amount))} (
          {formatPct(line.variance_pct === null ? null : Number(line.variance_pct))})
        </span>
        {commentary && (
          <span className="ml-auto flex items-center gap-2 text-xs text-[var(--muted)]">
            {commentary.owner_name && <span>owner: {commentary.owner_name}</span>}
            <Badge tone={commentary.review_status === "reviewed" ? "green" : "neutral"}>
              {commentary.review_status}
            </Badge>
          </span>
        )}
      </div>

      {!commentary ? (
        <p className="text-sm italic text-[var(--muted)]">
          No commentary row for this line.
        </p>
      ) : editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <ErrorBanner message={error} />}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setText(commentary.commentary_text);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-slate-700">
            {commentary.commentary_text}
          </p>
          <div className="flex items-center gap-3 text-xs">
            {!readOnly && (
              <button
                className="font-medium text-indigo-600 hover:underline"
                onClick={() => {
                  setEditing(true);
                  setText(commentary.commentary_text);
                }}
              >
                Edit
              </button>
            )}
            {edits.length > 0 && (
              <button
                className="font-medium text-slate-500 hover:underline"
                onClick={() => setShowHistory((v) => !v)}
              >
                {showHistory ? "Hide" : "Edit history"} ({edits.length})
              </button>
            )}
          </div>
          {showHistory && edits.length > 0 && (
            <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
              {edits.map((e) => (
                <div key={e.id} className="border-l-2 border-slate-300 pl-3 text-xs">
                  <div className="text-[var(--muted)]">
                    {e.edited_by ?? "—"} · {formatDateTime(e.edited_at)}
                  </div>
                  <div className="mt-0.5 text-slate-400 line-through">
                    {e.previous_text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
