import Link from "next/link";
import { getCompanies } from "@/lib/data";
import { loadModel } from "@/lib/model-server";
import { CompanySelector } from "@/components/company-selector";
import { ModelClient } from "@/components/model-client";
import { PageHeader, EmptyState, ErrorBanner } from "@/components/ui";
import { periodShort } from "@/lib/forecast";

export const dynamic = "force-dynamic";

export default async function ModelPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const { company: companyParam } = await searchParams;
  try {
    const companies = await getCompanies();
    if (companies.length === 0) {
      return <EmptyState title="No company configured" message="Create a company in Settings first." />;
    }
    const company = companies.find((c) => c.id === companyParam) ?? companies[0];
    const model = await loadModel(company.id);

    return (
      <>
        <PageHeader
          title="Forecast"
          subtitle="Forward-looking P&L: actuals grown by editable drivers, across Base / Conservative / Upside scenarios."
          actions={
            <CompanySelector companies={companies} selectedId={company.id} basePath="/model" />
          }
        />
        {!model.hasActuals ? (
          <EmptyState
            title="No actuals to forecast from"
            message="Ingest at least one month of trial balance for this company — the forecast grows from its actual P&L."
            action={
              <Link
                href="/ingest"
                className="inline-flex items-center rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Ingest a trial balance →
              </Link>
            }
          />
        ) : (
          <ModelClient
            results={model.results}
            years={model.years}
            lastActualLabel={
              model.results.Base.lastActualPeriod
                ? periodShort(model.results.Base.lastActualPeriod)
                : "—"
            }
          />
        )}
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
