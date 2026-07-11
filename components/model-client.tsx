"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { LineChart, type ChartSeries } from "@/components/line-chart";
import { formatCurrency } from "@/lib/format";
import { lineLabel } from "@/lib/format";
import {
  SCENARIOS,
  fyNet,
  periodYear,
  type ForecastResult,
  type ScenarioName,
} from "@/lib/forecast";

const scenarioTone: Record<ScenarioName, "indigo" | "amber" | "green"> = {
  Base: "indigo",
  Conservative: "amber",
  Upside: "green",
};

function lineFyTotal(result: ForecastResult, line: ForecastResult["lines"][number], year: number) {
  return Object.entries(line.values)
    .filter(([p]) => periodYear(p) === year)
    .reduce((s, [, v]) => s + v, 0);
}

export function ModelClient({
  results,
  years,
  lastActualLabel,
}: {
  results: Record<ScenarioName, ForecastResult>;
  years: number[];
  lastActualLabel: string;
}) {
  const [scenario, setScenario] = useState<ScenarioName>("Base");
  const r = results[scenario];
  const forecastStart = r.actualPeriods.length; // index where forecast begins

  const netSeries: ChartSeries[] = [
    {
      label: "Net result",
      color: "#4f46e5",
      points: r.net.map((n, i) => ({ x: i, value: n.value, forecast: n.mode === "forecast" })),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-white p-0.5">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                scenario === s ? "bg-[var(--brand)] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="text-sm text-[var(--muted)]">
          Actuals to <span className="font-medium">{lastActualLabel}</span>, then
          driver-based forecast.{" "}
          <Link href="/model/assumptions" className="font-medium text-indigo-600 hover:underline">
            Edit drivers →
          </Link>
        </div>
      </div>

      {/* FY net-result KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {years.map((y) => {
          const val = fyNet(r, y);
          const isForecastYear = y > periodYear(r.lastActualPeriod ?? `${y}-01-01`);
          return (
            <Card key={y} className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                FY{y}
                {isForecastYear && <Badge tone={scenarioTone[scenario]}>forecast</Badge>}
              </div>
              <div className={`mt-1 text-xl font-semibold tabular ${val < 0 ? "text-red-600" : ""}`}>
                {formatCurrency(val)}
              </div>
              <div className="text-xs text-[var(--muted)]">net result</div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="mb-1 text-sm font-semibold">
          Net result — 48-month outlook ({scenario})
        </div>
        <LineChart
          series={netSeries}
          markerLabels={
            r.forecastPeriods.length
              ? [{ x: forecastStart, label: "forecast →" }]
              : []
          }
        />
      </Card>

      {/* P&L by line, FY totals */}
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">
          Management P&amp;L — FY totals ({scenario})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm tabular">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-4 py-2 font-medium">Management line</th>
                {years.map((y) => (
                  <th key={y} className="px-4 py-2 text-right font-medium">
                    FY{y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.lines.map((line) => (
                <tr key={`${line.management_line}|${line.segment}`} className="border-b border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{lineLabel(line)}</td>
                  {years.map((y) => {
                    const v = lineFyTotal(r, line, y);
                    return (
                      <td key={y} className={`px-4 py-2 text-right ${v < 0 ? "text-red-600" : ""}`}>
                        {formatCurrency(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold">
                <td className="px-4 py-2.5">Net result</td>
                {years.map((y) => {
                  const v = fyNet(r, y);
                  return (
                    <td key={y} className={`px-4 py-2.5 text-right ${v < 0 ? "text-red-600" : ""}`}>
                      {formatCurrency(v)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <p className="text-xs text-[var(--muted)]">
        Forecast = each line&apos;s trailing 3-month actual average, grown by the
        scenario&apos;s revenue/cost drivers (monthly compounding). Change the
        assumptions on the{" "}
        <Link href="/model/assumptions" className="font-medium text-indigo-600 hover:underline">
          Drivers
        </Link>{" "}
        page and every figure here recomputes.
      </p>
    </div>
  );
}
