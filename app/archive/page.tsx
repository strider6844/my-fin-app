import Link from "next/link";
import { getCompanies, getPublishedReports } from "@/lib/data";
import { Badge, Card, EmptyState, ErrorBanner, PageHeader } from "@/components/ui";
import { formatDateTime, periodToLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  try {
    const [reports, companies] = await Promise.all([
      getPublishedReports(),
      getCompanies(),
    ]);
    const companyName = (id: string) =>
      companies.find((c) => c.id === id)?.name ?? "—";

    return (
      <>
        <PageHeader
          title="Board-Pack Archive"
          subtitle="Published reports, frozen at approval. Each opens the exact snapshot the board signed off — unchanged even if later periods are re-ingested."
        />

        {reports.length === 0 ? (
          <EmptyState
            title="No published reports yet"
            message="When Finance publishes (or a CFO approves) a report, its immutable snapshot is archived here."
            action={
              <Link
                href="/report"
                className="inline-flex items-center rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Go to reports →
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => (
              <Link key={r.id} href={`/archive/${r.id}`}>
                <Card className="p-4 transition hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{periodToLabel(r.period)}</span>
                    <Badge tone="green">Published</Badge>
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted)]">
                    {companyName(r.company_id)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted)]">
                    {r.published_by ? `by ${r.published_by} · ` : ""}
                    {formatDateTime(r.published_at)}
                  </div>
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
