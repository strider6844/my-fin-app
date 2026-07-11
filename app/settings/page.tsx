import { getCompanies } from "@/lib/data";
import { SettingsClient } from "@/components/settings-client";
import { PageHeader, ErrorBanner } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  try {
    const companies = await getCompanies();
    return (
      <>
        <PageHeader
          title="Settings &amp; Assumptions"
          subtitle="Company-level assumptions. The materiality threshold controls which variances get flagged for commentary."
        />
        <SettingsClient companies={companies} />
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
