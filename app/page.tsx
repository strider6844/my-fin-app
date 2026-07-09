import Link from "next/link";
import {
  getDefaultCompany,
  getPeriodsWithData,
  getReport,
  getVarianceLines,
} from "@/lib/data";
import { PnlTable } from "@/components/pnl-table";
import { Card, PageHeader, Badge, EmptyState, ErrorBanner } from "@/components/ui";
import { formatCurrency, periodToLabel, periodToSlug } from "@/lib/format";
import type { ReportStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusTone(status: ReportStatus | "none") {
  return status === "published"
    ? "green"
    : status === "submitted"
      ? "amber"
      : status === "draft"
        ? "indigo"
        : "neutral";
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-[var(--muted)]">{hint}</div>}
    </Card>
  );
}

export default async function Home() {
  let content: React.ReactNode;
  try {
    const company = await getDefaultCompany();
    if (!company) {
      content = (
        <EmptyState
          title="No company configured"
          message="Seed data is missing. Apply the migration in supabase/migrations to get started."
        />
      );
    } else {
      const periods = await getPeriodsWithData(company.id);
      const latest = periods[0] ?? null;

      if (!latest) {
        content = (
          <EmptyState
            title="No reports yet"
            message="Upload a trial balance to generate your first management P&L."
            action={
              <Link
                href="/ingest"
                className="inline-flex items-center rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Upload trial balance →
              </Link>
            }
          />
        );
      } else {
        const [lines, report] = await Promise.all([
          getVarianceLines(company.id, latest),
          getReport(company.id, latest),
        ]);
        const flagged = lines.filter((l) => l.is_flagged);
        const status = report?.status ?? "draft";

        content = (
          <>
            <PageHeader
              title={`${company.name} — Management P&L`}
              subtitle={`Latest period: ${periodToLabel(latest)}. Variance vs budget, material lines flagged.`}
              actions={
                <>
                  <Link
                    href="/ingest"
                    className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Upload TB
                  </Link>
                  <Link
                    href={`/report/${periodToSlug(latest)}`}
                    className="inline-flex items-center rounded-lg bg-[var(--brand)] px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Open full report →
                  </Link>
                </>
              }
            />

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Report status"
                value={
                  <Badge tone={statusTone(status)}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </Badge>
                }
                hint={periodToLabel(latest)}
              />
              <StatTile
                label="Flagged lines"
                value={flagged.length}
                hint={`of ${lines.length} management lines`}
              />
              <StatTile
                label="Materiality"
                value={formatCurrency(company.materiality_threshold)}
                hint="flag threshold"
              />
              <StatTile
                label="Periods on file"
                value={periods.length}
                hint="with computed variances"
              />
            </div>

            <Card className="p-2 sm:p-4">
              <PnlTable lines={lines} />
            </Card>

            {flagged.length > 0 && (
              <p className="mt-4 text-sm text-[var(--muted)]">
                {flagged.length} line{flagged.length === 1 ? "" : "s"} exceed the
                materiality threshold and need commentary.{" "}
                <Link
                  href={`/report/${periodToSlug(latest)}`}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  Review &amp; publish →
                </Link>
              </p>
            )}
          </>
        );
      }
    }
  } catch (e) {
    content = <ErrorBanner message={(e as Error).message} />;
  }

  return content;
}
