import { getCompanies } from "@/lib/data";
import { loadModel } from "@/lib/model-server";
import { CompanySelector } from "@/components/company-selector";
import { LineChart, type ChartSeries } from "@/components/line-chart";
import { Card, PageHeader, EmptyState, ErrorBanner, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { SCENARIOS, fyNet, fySum, type ScenarioName } from "@/lib/forecast";

export const dynamic = "force-dynamic";

const colors: Record<ScenarioName, string> = {
  Base: "#4f46e5",
  Conservative: "#d97706",
  Upside: "#059669",
};
const tone: Record<ScenarioName, "indigo" | "amber" | "green"> = {
  Base: "indigo",
  Conservative: "amber",
  Upside: "green",
};

export default async function ScenariosPage({
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
    const model = await loadModel(company.id);

    if (!model.hasActuals) {
      return (
        <>
          <PageHeader title="Scenarios" subtitle="Base / Conservative / Upside, side by side." />
          <EmptyState
            title="No actuals to forecast from"
            message="Ingest a trial balance for this company to build scenarios."
          />
        </>
      );
    }

    const series: ChartSeries[] = SCENARIOS.map((s) => ({
      label: s,
      color: colors[s],
      points: model.results[s].net.map((n, i) => ({
        x: i,
        value: n.value,
        forecast: n.mode === "forecast",
      })),
    }));
    const forecastStart = model.results.Base.actualPeriods.length;

    return (
      <>
        <PageHeader
          title="Scenarios"
          subtitle="Base, Conservative and Upside side by side. Scenarios flex the revenue and cost growth drivers."
          actions={
            <CompanySelector companies={companies} selectedId={company.id} basePath="/model/scenarios" />
          }
        />

        <Card className="mb-6 p-4">
          <div className="mb-1 text-sm font-semibold">Net result — all scenarios</div>
          <LineChart series={series} markerLabels={[{ x: forecastStart, label: "forecast →" }]} />
        </Card>

        <div className="grid gap-3 md:grid-cols-3">
          {SCENARIOS.map((s) => {
            const r = model.results[s];
            const forecastYears = model.years.filter(
              (y) => y > (r.lastActualPeriod ? Number(r.lastActualPeriod.slice(0, 4)) : 0),
            );
            return (
              <Card key={s} className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone={tone[s]}>{s}</Badge>
                </div>
                <table className="w-full text-sm tabular">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                      <th className="py-1 font-medium">FY</th>
                      <th className="py-1 text-right font-medium">Revenue</th>
                      <th className="py-1 text-right font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.years.map((y) => {
                      const net = fyNet(r, y);
                      const rev = fySum(r.revenue, y);
                      const isF = forecastYears.includes(y);
                      return (
                        <tr key={y} className="border-t border-slate-100">
                          <td className="py-1.5">
                            FY{y} {isF && <span className="text-[10px] text-[var(--muted)]">(f)</span>}
                          </td>
                          <td className="py-1.5 text-right">{formatCurrency(rev)}</td>
                          <td className={`py-1.5 text-right font-medium ${net < 0 ? "text-red-600" : ""}`}>
                            {formatCurrency(net)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-[var(--muted)]">
          Same actuals, different assumptions. Tune each scenario&apos;s drivers on
          the Drivers page — this comparison recomputes from them.
        </p>
      </>
    );
  } catch (e) {
    return <ErrorBanner message={(e as Error).message} />;
  }
}
