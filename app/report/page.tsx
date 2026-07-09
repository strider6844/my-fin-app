import Link from "next/link";
import { getCompanies, getReports, getVarianceLines } from "@/lib/data";
import { CompanySelector } from "@/components/company-selector";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
} from "@/components/ui";
import { formatDateTime, periodToLabel, periodToSlug } from "@/lib/format";
import type { ReportStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusTone(s: ReportStatus) {
  return s === "published" ? "green" : s === "submitted" ? "amber" : "indigo";
}

export default async function ReportsIndex({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company: companyParam } = await searchParams;
  try {
    const companies = await getCompanies();
    if (companies.length === 0) {
      return (
        <EmptyState
          title="No company configured"
          message="Seed data is missing. Apply the migration in supabase/migrations."
        />
      );
    }
    const company = companies.find((c) => c.id === companyParam) ?? companies[0];
    const reports = await getReports(company.id);

    // count flagged per period for a quick signal
    const withCounts = await Promise.all(
      reports.map(async (r) => {
        const lines = await getVarianceLines(company.id, r.period);
        return { report: r, flagged: lines.filter((l) => l.is_flagged).length, lines: lines.length };
      }),
    );

    return (
      <>
        <PageHeader
          title="Reports"
          subtitle="Every period's management report. Open one to review variances, edit commentary, and publish."
          actions={
            <>
              <CompanySelector
                companies={companies}
                selectedId={company.id}
                basePath="/report"
              />
              <Link
                href="/ingest"
                className="inline-flex items-center rounded-lg bg-[var(--brand)] px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                New ingest
              </Link>
            </>
          }
        />

        {withCounts.length === 0 ? (
          <EmptyState
            title="No reports yet"
            message="Upload a trial balance to generate your first management report."
            action={
              <Link
                href="/ingest"
                className="inline-flex items-center rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Upload trial balance →
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {withCounts.map(({ report, flagged, lines }) => (
              <Link key={report.id} href={`/report/${periodToSlug(report.period)}`}>
                <Card className="p-4 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{periodToLabel(report.period)}</span>
                    <Badge tone={statusTone(report.status)}>{report.status}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {lines} management lines · {flagged} flagged
                  </div>
                  {report.published_at && (
                    <div className="mt-1 text-xs text-[var(--muted)]">
                      Published {formatDateTime(report.published_at)}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
