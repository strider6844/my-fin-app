import { getCompanies } from "@/lib/data";
import { getModelConfig } from "@/lib/model-store";
import { CompanySelector } from "@/components/company-selector";
import { DriversClient } from "@/components/drivers-client";
import { PageHeader, EmptyState, ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AssumptionsPage({
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
    const config = await getModelConfig(company.id);

    return (
      <>
        <PageHeader
          title="Drivers &amp; Assumptions"
          subtitle="The register that powers the forecast. Each driver has a value per scenario; changing one recomputes every projection."
          actions={
            <CompanySelector companies={companies} selectedId={company.id} basePath="/model/assumptions" />
          }
        />
        <DriversClient companyId={company.id} config={config} />
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
