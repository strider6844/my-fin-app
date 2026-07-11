import { getBudgetLines, getCompanies, getMappingTargets } from "@/lib/data";
import { BudgetClient } from "@/components/budget-client";
import { PageHeader, ErrorBanner, EmptyState } from "@/components/ui";
import { periodToSlug, slugToPeriod } from "@/lib/format";

export const dynamic = "force-dynamic";

// Default budget month = the most recent completed month (current month - 1).
function defaultMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based; this is already "last month" as 1-based
  const month = m === 0 ? 12 : m;
  const year = m === 0 ? y - 1 : y;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; period?: string }>;
}) {
  const { company: companyParam, period: periodParam } = await searchParams;
  try {
    const companies = await getCompanies();
    if (companies.length === 0) {
      return (
        <EmptyState
          title="No company configured"
          message="Create a company in Settings first."
        />
      );
    }
    const company = companies.find((c) => c.id === companyParam) ?? companies[0];
    const periodSlug = periodParam ? periodToSlug(slugToPeriod(periodParam)) : defaultMonth();
    const period = slugToPeriod(periodSlug);

    const [targets, existing] = await Promise.all([
      getMappingTargets(company.id),
      getBudgetLines(company.id, period),
    ]);

    return (
      <>
        <PageHeader
          title="Budget"
          subtitle="Set the plan each management line is measured against. This is the benchmark the variance engine uses — edit it before you ingest a new month."
        />
        <BudgetClient
          companies={companies}
          companyId={company.id}
          period={periodSlug}
          targets={targets}
          existing={existing}
        />
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
