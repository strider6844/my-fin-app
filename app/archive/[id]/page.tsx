import Link from "next/link";
import { getCompanies, getReportById } from "@/lib/data";
import { PnlTable, lineLabel } from "@/components/pnl-table";
import { Badge, Card, EmptyState, ErrorBanner } from "@/components/ui";
import { formatCurrency, formatDateTime, periodToLabel } from "@/lib/format";
import type { Commentary, VarianceLine } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Snapshot {
  period: string;
  frozen_at: string;
  variance_lines: VarianceLine[];
  commentaries: Commentary[];
}

export default async function ArchiveSnapshotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const report = await getReportById(id);
    if (!report || report.status !== "published" || !report.snapshot_json) {
      return (
        <EmptyState
          title="Snapshot not available"
          message="This report has no frozen snapshot. Only published reports are archived."
          action={
            <Link
              href="/archive"
              className="inline-flex items-center rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              ← Back to archive
            </Link>
          }
        />
      );
    }

    const companies = await getCompanies();
    const companyName =
      companies.find((c) => c.id === report.company_id)?.name ?? "—";
    const snap = report.snapshot_json as Snapshot;

    const lines = [...(snap.variance_lines ?? [])].sort((a, b) => {
      if (a.is_flagged !== b.is_flagged) return a.is_flagged ? -1 : 1;
      return Math.abs(Number(b.variance_amount)) - Math.abs(Number(a.variance_amount));
    });
    const commentaryByVar = new Map(
      (snap.commentaries ?? []).map((c) => [c.variance_line_id, c]),
    );
    const flagged = lines.filter((l) => l.is_flagged);

    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/archive"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Board-pack archive
          </Link>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {companyName} — {periodToLabel(report.period)}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
                <Badge tone="green">Published snapshot</Badge>
                {report.published_by ? `by ${report.published_by} · ` : ""}
                {formatDateTime(report.published_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Immutable snapshot frozen at {formatDateTime(snap.frozen_at)}. These
          figures will not change even if the period is re-ingested.
        </div>

        <Card className="p-2 sm:p-4">
          <PnlTable lines={lines} />
        </Card>

        {flagged.length > 0 && (
          <div>
            <h2 className="mb-3 text-lg font-semibold">Commentary</h2>
            <div className="space-y-3">
              {flagged.map((line) => {
                const c = commentaryByVar.get(line.id);
                return (
                  <Card key={line.id} className="p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold">{lineLabel(line)}</span>
                      <Badge tone="red">Flagged</Badge>
                      <span className="text-sm text-red-600">
                        {formatCurrency(Number(line.variance_amount))}
                      </span>
                      {c?.owner_name && (
                        <span className="ml-auto text-xs text-[var(--muted)]">
                          {c.owner_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {c?.commentary_text ?? "No commentary."}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
