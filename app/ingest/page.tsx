import { getCompanies } from "@/lib/data";
import { IngestClient } from "@/components/ingest-client";
import { PageHeader, ErrorBanner, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function IngestPage() {
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
    return (
      <>
        <PageHeader
          title="Ingest Trial Balance"
          subtitle="Drop a TB export, pick the period, and generate the management P&L. The engine does the rest — no Excel."
        />
        <IngestClient companies={companies} defaultPeriod="2025-03" />
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
