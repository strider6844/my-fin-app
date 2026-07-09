import { getAccountMap, getCompanies } from "@/lib/data";
import { AccountMapClient } from "@/components/account-map-client";
import { CompanySelector } from "@/components/company-selector";
import { PageHeader, ErrorBanner, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AccountMapPage({
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
    const selected =
      companies.find((c) => c.id === companyParam) ?? companies[0];
    const rows = await getAccountMap(selected.id);

    return (
      <>
        <PageHeader
          title="Account Map"
          subtitle="Map raw trial-balance account codes to management P&L lines. Defined once per company; used by every ingest."
          actions={
            <CompanySelector
              companies={companies}
              selectedId={selected.id}
              basePath="/account-map"
            />
          }
        />
        <AccountMapClient rows={rows} companyId={selected.id} />
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
