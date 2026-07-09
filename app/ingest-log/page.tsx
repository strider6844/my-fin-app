import { getAuditLogs, getCompanies, getIngestLogs } from "@/lib/data";
import { CompanySelector } from "@/components/company-selector";
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
} from "@/components/ui";
import { formatDateTime, periodToLabel } from "@/lib/format";
import type { IngestStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function statusTone(s: IngestStatus) {
  return s === "processed"
    ? "green"
    : s === "failed"
      ? "red"
      : s === "processing"
        ? "amber"
        : "neutral";
}

export default async function IngestLogPage({
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
    const selected = companies.find((c) => c.id === companyParam) ?? companies[0];
    const [logs, audit] = await Promise.all([
      getIngestLogs(selected.id),
      getAuditLogs(30),
    ]);

    return (
      <>
        <PageHeader
          title="Ingest Log &amp; Audit Trail"
          subtitle="Every file drop and every change, recorded. Filename, period, checksum, status — plus the full audit trail."
          actions={
            <CompanySelector
              companies={companies}
              selectedId={selected.id}
              basePath="/ingest-log"
            />
          }
        />

        <Card className="mb-8 overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
            Ingest events
          </div>
          {logs.length === 0 ? (
            <EmptyState
              title="No ingests yet"
              message="Upload a trial balance on the Ingest page to see it recorded here with its checksum and status."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-4 py-2 font-medium">Filename</th>
                    <th className="px-4 py-2 font-medium">Period</th>
                    <th className="px-4 py-2 font-medium">Ingested</th>
                    <th className="px-4 py-2 font-medium">Checksum</th>
                    <th className="px-4 py-2 text-right font-medium">Rows</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium">{l.filename}</td>
                      <td className="px-4 py-2.5">{periodToLabel(l.period)}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {formatDateTime(l.ingested_at)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                        {l.checksum.length > 22
                          ? l.checksum.slice(0, 22) + "…"
                          : l.checksum}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular">
                        {l.row_count ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={statusTone(l.status)}>{l.status}</Badge>
                        {l.status === "failed" && l.error_message && (
                          <span className="ml-2 text-xs text-red-600">
                            {l.error_message}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
            Audit trail
          </div>
          {audit.length === 0 ? (
            <EmptyState
              title="No audit events yet"
              message="Ingests, commentary edits, and report publishes are recorded here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {audit.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <Badge tone="slate">{a.action}</Badge>
                  <span className="text-slate-600">{a.object_type}</span>
                  <span className="ml-auto text-xs text-[var(--muted)]">
                    {a.performed_by ?? "—"} · {formatDateTime(a.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
