import Link from "next/link";
import {
  getCommentaries,
  getCommentaryEdits,
  getCompanies,
  getReport,
  getVarianceLines,
} from "@/lib/data";
import { ReportView } from "@/components/report-view";
import { Card, EmptyState, ErrorBanner, InfoBanner } from "@/components/ui";
import { PnlTable } from "@/components/pnl-table";
import { periodToLabel, slugToPeriod } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ period: string }>;
  searchParams: Promise<{ company?: string }>;
}) {
  const { period: slug } = await params;
  const { company: companyParam } = await searchParams;
  const period = slugToPeriod(slug);

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

    const [lines, commentaries, report] = await Promise.all([
      getVarianceLines(company.id, period),
      getCommentaries(company.id, period),
      getReport(company.id, period),
    ]);

    if (lines.length === 0) {
      return (
        <EmptyState
          title={`No report for ${periodToLabel(period)}`}
          message="No variance data for this period. Upload a trial balance to get started."
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
    }

    const edits = await getCommentaryEdits(commentaries.map((c) => c.id));
    const hasBudget = lines.some((l) => Number(l.budget_amount) !== 0);

    if (!report) {
      return (
        <div className="space-y-4">
          <InfoBanner>
            Variance data exists for {periodToLabel(period)} but no report record
            was found. Re-run ingest to enable publishing.
          </InfoBanner>
          <Card className="p-4">
            <PnlTable lines={lines} />
          </Card>
        </div>
      );
    }

    return (
      <ReportView
        report={report}
        companyName={company.name}
        periodLabel={periodToLabel(period)}
        lines={lines}
        commentaries={commentaries}
        editsByCommentary={edits}
        hasBudget={hasBudget}
      />
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
