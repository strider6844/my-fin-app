"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Card, ErrorBanner, Badge } from "@/components/ui";
import { SCENARIOS, type Driver, type ModelConfig, type ScenarioName } from "@/lib/forecast";

// Driver values are stored as fractions (0.08); the register edits whole percents.
const toPct = (v: number) => (v * 100).toString();
const fromPct = (s: string) => (Number(s) || 0) / 100;

export function DriversClient({
  companyId,
  config,
}: {
  companyId: string;
  config: ModelConfig;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // editable percent values: values[scenario][driverKey]
  const [values, setValues] = useState<Record<ScenarioName, Record<string, string>>>(() => {
    const v = {} as Record<ScenarioName, Record<string, string>>;
    for (const s of SCENARIOS) {
      v[s] = {};
      for (const d of config.drivers) v[s][d.key] = toPct(config.scenarios[s]?.[d.key] ?? 0);
    }
    return v;
  });

  function set(s: ScenarioName, key: string, val: string) {
    setValues((prev) => ({ ...prev, [s]: { ...prev[s], [key]: val } }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const scenarios = {} as Record<ScenarioName, Record<string, number>>;
      for (const s of SCENARIOS) {
        scenarios[s] = {};
        for (const d of config.drivers) scenarios[s][d.key] = fromPct(values[s][d.key]);
      }
      const res = await fetch("/api/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, scenarios, drivers: config.drivers }),
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
    "w-24 rounded-md border border-[var(--border)] px-2 py-1 text-right text-sm tabular focus:border-indigo-400 focus:outline-none";

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}
      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Drivers saved. The forecast and scenarios have recomputed.
        </div>
      )}

      <Card className="overflow-hidden">
        {/* Mobile: one card per driver, labeled scenario inputs */}
        <div className="divide-y divide-slate-100 md:hidden">
          {config.drivers.map((d: Driver) => (
            <div key={d.key} className="space-y-2 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{d.label}</span>
                  <Badge tone="neutral">{d.category}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{d.rationale}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SCENARIOS.map((s) => (
                  <label key={s} className="block">
                    <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                      {s}
                    </span>
                    <input
                      inputMode="decimal"
                      className="w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-right text-sm tabular focus:border-indigo-400 focus:outline-none"
                      value={values[s][d.key]}
                      onChange={(e) => set(s, d.key, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="text-[11px] text-[var(--muted)]">{d.unit}</div>
            </div>
          ))}
        </div>
        {/* Desktop: full grid */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2 font-medium">Driver</th>
                <th className="px-4 py-2 font-medium">Category</th>
                {SCENARIOS.map((s) => (
                  <th key={s} className="px-4 py-2 text-right font-medium">
                    {s}
                  </th>
                ))}
                <th className="px-4 py-2 font-medium">Unit</th>
              </tr>
            </thead>
            <tbody>
              {config.drivers.map((d: Driver) => (
                <tr key={d.key} className="border-b border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{d.label}</div>
                    <div className="mt-0.5 max-w-md text-xs text-[var(--muted)]">{d.rationale}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{d.category}</Badge>
                  </td>
                  {SCENARIOS.map((s) => (
                    <td key={s} className="px-4 py-3 text-right">
                      <input
                        className={inputCls}
                        value={values[s][d.key]}
                        onChange={(e) => set(s, d.key, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">{d.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save drivers"}
          </Button>
          <span className="text-xs text-[var(--muted)]">
            Values are annual growth rates. Scenarios flex revenue and cost growth;
            saving recomputes the forecast.
          </span>
        </div>
      </Card>

      {config.updated_at && (
        <p className="text-xs text-[var(--muted)]">
          Last updated {new Date(config.updated_at).toLocaleString("en-GB")}
          {config.updated_by ? ` by ${config.updated_by}` : ""}.
        </p>
      )}
    </div>
  );
}
