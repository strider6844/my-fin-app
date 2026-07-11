"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Badge, Card, ErrorBanner, WarningBanner } from "@/components/ui";
import { formatCurrency, lineLabel } from "@/lib/format";
import type { BudgetLine, Company } from "@/lib/types";
import type { MappingTarget } from "@/lib/data";

export function BudgetClient({
  companies,
  companyId,
  period,
  targets,
  existing,
}: {
  companies: Company[];
  companyId: string;
  period: string; // YYYY-MM
  targets: MappingTarget[];
  existing: BudgetLine[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const keyOf = (line: string, seg: string | null) => `${line}||${seg ?? ""}`;
  const existingByKey = new Map(
    existing.map((b) => [keyOf(b.management_line, b.segment), Math.abs(Number(b.amount))]),
  );

  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(
      targets.map((t) => {
        const k = keyOf(t.management_line, t.segment);
        const v = existingByKey.get(k);
        return [k, v !== undefined ? String(v) : ""];
      }),
    ),
  );

  const signedTotal = targets.reduce((sum, t) => {
    const k = keyOf(t.management_line, t.segment);
    const mag = Number(amounts[k]) || 0;
    return sum + mag * t.polarity;
  }, 0);

  function nav(nextCompany: string, nextPeriod: string) {
    router.push(`/budget?company=${nextCompany}&period=${nextPeriod}`);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const lines = targets.map((t) => {
        const k = keyOf(t.management_line, t.segment);
        const mag = Number(amounts[k]) || 0;
        return {
          management_line: t.management_line,
          segment: t.segment,
          amount: mag * t.polarity,
        };
      });
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, period, lines }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-right text-sm tabular focus:border-indigo-400 focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        {companies.length > 1 && (
          <label className="text-sm text-[var(--muted)]">
            <span className="mb-1 block text-xs font-medium">Company</span>
            <select
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-slate-800"
              value={companyId}
              onChange={(e) => nav(e.target.value, period)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm text-[var(--muted)]">
          <span className="mb-1 block text-xs font-medium">Budget month</span>
          <input
            type="month"
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-sm text-slate-800"
            value={period}
            onChange={(e) => nav(companyId, e.target.value)}
          />
        </label>
      </div>

      {error && <ErrorBanner message={error} />}
      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Budget saved for this month. Ingest a trial balance to see variances
          against it.
        </div>
      )}

      {targets.length === 0 ? (
        <WarningBanner>
          No account mappings yet for this company — add them on the{" "}
          <a href="/account-map" className="font-medium underline">
            Account Map
          </a>{" "}
          page first. The budget is entered per management line.
        </WarningBanner>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-2 font-medium">Management line</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 text-right font-medium">
                    Budget amount ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => {
                  const k = keyOf(t.management_line, t.segment);
                  return (
                    <tr key={k} className="border-b border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {lineLabel(t)}
                      </td>
                      <td className="px-4 py-2">
                        {t.polarity === -1 ? (
                          <Badge tone="amber">Cost</Badge>
                        ) : (
                          <Badge tone="green">Income</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className={inputCls}
                          placeholder="0"
                          value={amounts[k] ?? ""}
                          onChange={(e) =>
                            setAmounts({ ...amounts, [k]: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold">
                  <td className="px-4 py-2.5" colSpan={2}>
                    Budgeted net result
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right tabular ${signedTotal < 0 ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {formatCurrency(signedTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-3">
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save budget"}
            </Button>
            <span className="text-xs text-[var(--muted)]">
              Enter positive amounts — costs are subtracted automatically.
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
