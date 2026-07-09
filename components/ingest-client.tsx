"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Card, ErrorBanner, WarningBanner, InfoBanner, Badge } from "@/components/ui";
import type { Company } from "@/lib/types";

interface IngestResult {
  ingest_log_id: string;
  period: string;
  period_slug: string;
  row_count: number;
  variance_lines: number;
  flagged: number;
  unmapped_codes: string[];
  has_budget: boolean;
}

export function IngestClient({
  companies,
  defaultPeriod,
}: {
  companies: Company[];
  defaultPeriod: string; // YYYY-MM
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [period, setPeriod] = useState(defaultPeriod);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);

  async function handleSubmit() {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Choose a trial-balance file (CSV or XLSX) first.");
      return;
    }
    if (!companyId || !period) {
      setError("Select a company and period.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("company_id", companyId);
      fd.append("period", period);
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Ingest failed (${res.status}).`);
        return;
      }
      setResult(json as IngestResult);
      router.refresh(); // refresh server data (ingest log, reports) elsewhere
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";

  return (
    <div className="grid gap-6 md:grid-cols-5">
      <div className="md:col-span-3 space-y-4">
        <Card className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Company</label>
            <select
              className={inputCls}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Period</label>
            <input
              type="month"
              className={inputCls}
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              The month these actuals belong to. Budget for this period is the
              variance benchmark.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Trial balance file
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              CSV or XLSX. Needs an account code column and an amount (or
              debit/credit) column.
            </p>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={handleSubmit} disabled={busy}>
              {busy ? "Generating report…" : "Generate Report"}
            </Button>
            {file && (
              <span className="text-xs text-[var(--muted)]">{file.name}</span>
            )}
          </div>
        </Card>

        {result && (
          <Card className="border-emerald-200 bg-emerald-50/40 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone="green">Processed</Badge>
              <span className="text-sm font-medium">
                Report generated for {result.period}
              </span>
            </div>
            <ul className="mb-3 space-y-1 text-sm text-slate-700">
              <li>• {result.row_count} rows parsed from the file</li>
              <li>• {result.variance_lines} management lines computed</li>
              <li>• {result.flagged} line(s) flagged as material</li>
            </ul>
            {!result.has_budget && (
              <div className="mb-3">
                <WarningBanner>
                  No budget loaded for this period — variances cannot be flagged.
                  Actuals are shown as-is.
                </WarningBanner>
              </div>
            )}
            {result.unmapped_codes.length > 0 && (
              <div className="mb-3">
                <WarningBanner>
                  {result.unmapped_codes.length} account code(s) were not in the
                  account map and were skipped:{" "}
                  <span className="font-mono">
                    {result.unmapped_codes.join(", ")}
                  </span>
                  . Map them on the Account Map page and re-ingest to include
                  them.
                </WarningBanner>
              </div>
            )}
            <div className="flex gap-2">
              <Link
                href={`/report/${result.period_slug}`}
                className="inline-flex items-center rounded-lg bg-[var(--brand)] px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Open report →
              </Link>
              <Link
                href="/ingest-log"
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                View ingest log
              </Link>
            </div>
          </Card>
        )}
      </div>

      <div className="md:col-span-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold">How ingest works</h3>
          <ol className="mt-2 space-y-2 text-sm text-[var(--muted)]">
            <li>1. File checksum (SHA-256) recorded to the ingest log.</li>
            <li>2. Rows parsed and matched to your account map.</li>
            <li>3. Variance engine: actuals − budget, per line.</li>
            <li>4. Material lines flagged; draft commentary stubbed.</li>
            <li>5. A draft report is created, ready to review.</li>
          </ol>
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <InfoBanner>
              No sample handy? Download the demo trial balance and upload it as-is:
              <br />
              <a
                href="/samples/TB_Acme_Mar2025.csv"
                download
                className="mt-1 inline-block font-medium text-indigo-700 hover:underline"
              >
                ⬇ TB_Acme_Mar2025.csv
              </a>
            </InfoBanner>
          </div>
        </Card>
      </div>
    </div>
  );
}
