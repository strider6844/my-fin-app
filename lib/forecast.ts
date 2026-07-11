// Deterministic, driver-based P&L forecast engine.
//
// The reporting side of the app looks backward (actuals vs budget). This is the
// forward-looking side: it takes a company's actual management-line P&L, a set
// of editable drivers, and a scenario, and projects each line forward monthly.
// Pure functions — the model recomputes whenever drivers change. No AI.

export type ScenarioName = "Base" | "Conservative" | "Upside";
export const SCENARIOS: ScenarioName[] = ["Base", "Conservative", "Upside"];

// A driver in the register. Its numeric value lives per-scenario (see ModelConfig).
export interface Driver {
  key: string;
  label: string;
  category: string;
  unit: string; // e.g. "% p.a."
  rationale: string;
  owner: string;
}

export type ScenarioValues = Record<string, number>;

export interface ModelConfig {
  drivers: Driver[];
  scenarios: Record<ScenarioName, ScenarioValues>;
  updated_at?: string | null;
  updated_by?: string | null;
}

// ── Defaults (used until a company saves its own) ──────────────────────────
export const DEFAULT_DRIVERS: Driver[] = [
  {
    key: "revenue_growth",
    label: "Revenue growth",
    category: "Growth",
    unit: "% p.a.",
    rationale: "Expected annual growth applied to income lines.",
    owner: "FP&A",
  },
  {
    key: "cost_growth",
    label: "Cost growth",
    category: "Cost",
    unit: "% p.a.",
    rationale: "Expected annual growth applied to cost lines (inflation + scaling).",
    owner: "FP&A",
  },
];

export const DEFAULT_CONFIG: ModelConfig = {
  drivers: DEFAULT_DRIVERS,
  scenarios: {
    Base: { revenue_growth: 0.08, cost_growth: 0.06 },
    Conservative: { revenue_growth: 0.03, cost_growth: 0.08 },
    Upside: { revenue_growth: 0.15, cost_growth: 0.05 },
  },
};

// ── Period helpers (periods are stored as YYYY-MM-01) ──────────────────────
export function addMonths(period: string, n: number): string {
  const [y, m] = period.split("-").map(Number);
  const total = (y * 12 + (m - 1)) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}
export function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by * 12 + bm) - (ay * 12 + am);
}
export function periodYear(period: string): number {
  return Number(period.split("-")[0]);
}
export function periodShort(period: string): string {
  const [y, m] = period.split("-");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1];
  return `${mon} ${y.slice(2)}`;
}

// ── Inputs ─────────────────────────────────────────────────────────────────
export interface ActualLineSeries {
  management_line: string;
  segment: string | null;
  // actual signed monthly values keyed by period (income +, cost -)
  byPeriod: Record<string, number>;
}

export interface ForecastLine {
  management_line: string;
  segment: string | null;
  polarity: 1 | -1; // income vs cost
  base: number; // trailing-average starting level
  values: Record<string, number>; // period -> value (actual for past, forecast for future)
}

export interface ForecastResult {
  scenario: ScenarioName;
  lastActualPeriod: string | null;
  actualPeriods: string[];
  forecastPeriods: string[];
  periods: { period: string; label: string; mode: "actual" | "forecast" }[];
  lines: ForecastLine[];
  net: { period: string; label: string; value: number; mode: "actual" | "forecast" }[];
  revenue: Record<string, number>;
  cost: Record<string, number>;
}

const monthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

// Trailing average of the last `k` actual values (chronological).
function trailingBase(series: ActualLineSeries, orderedActuals: string[], k = 3): number {
  const vals = orderedActuals.map((p) => series.byPeriod[p]).filter((v) => v !== undefined) as number[];
  const tail = vals.slice(-k);
  if (tail.length === 0) return 0;
  return tail.reduce((s, v) => s + v, 0) / tail.length;
}

export function buildForecast(
  actualLines: ActualLineSeries[],
  config: ModelConfig,
  scenario: ScenarioName,
): ForecastResult {
  // Timeline: all actual periods, then forecast to December of (lastYear + 2).
  const actualPeriodSet = new Set<string>();
  actualLines.forEach((l) => Object.keys(l.byPeriod).forEach((p) => actualPeriodSet.add(p)));
  const actualPeriods = [...actualPeriodSet].sort();
  const lastActual = actualPeriods[actualPeriods.length - 1] ?? null;

  const sc = config.scenarios[scenario] ?? DEFAULT_CONFIG.scenarios[scenario];
  const revM = monthlyRate(sc.revenue_growth ?? 0);
  const costM = monthlyRate(sc.cost_growth ?? 0);

  let forecastPeriods: string[] = [];
  if (lastActual) {
    const endPeriod = `${periodYear(lastActual) + 2}-12-01`;
    const horizon = Math.max(0, monthsBetween(lastActual, endPeriod));
    forecastPeriods = Array.from({ length: horizon }, (_, i) => addMonths(lastActual, i + 1));
  }

  const lines: ForecastLine[] = actualLines.map((l) => {
    const base = trailingBase(l, actualPeriods);
    const polarity: 1 | -1 = base >= 0 ? 1 : -1;
    const m = polarity > 0 ? revM : costM;
    const values: Record<string, number> = {};
    for (const p of actualPeriods) {
      if (l.byPeriod[p] !== undefined) values[p] = l.byPeriod[p];
    }
    forecastPeriods.forEach((p, i) => {
      values[p] = base * Math.pow(1 + m, i + 1);
    });
    return { management_line: l.management_line, segment: l.segment, polarity, base, values };
  });

  const periods = [
    ...actualPeriods.map((p) => ({ period: p, label: periodShort(p), mode: "actual" as const })),
    ...forecastPeriods.map((p) => ({ period: p, label: periodShort(p), mode: "forecast" as const })),
  ];

  const revenue: Record<string, number> = {};
  const cost: Record<string, number> = {};
  const net = periods.map(({ period, label, mode }) => {
    let r = 0, c = 0;
    for (const line of lines) {
      const v = line.values[period] ?? 0;
      if (line.polarity > 0) r += v;
      else c += v;
    }
    revenue[period] = r;
    cost[period] = c;
    return { period, label, value: r + c, mode };
  });

  return { scenario, lastActualPeriod: lastActual, actualPeriods, forecastPeriods, periods, lines, net, revenue, cost };
}

// FY roll-up of the net result (sum of Jan–Dec of `year`).
export function fyNet(result: ForecastResult, year: number): number {
  return result.net.filter((n) => periodYear(n.period) === year).reduce((s, n) => s + n.value, 0);
}
export function fySum(map: Record<string, number>, year: number): number {
  return Object.entries(map)
    .filter(([p]) => periodYear(p) === year)
    .reduce((s, [, v]) => s + v, 0);
}
// Years that appear in the timeline.
export function timelineYears(result: ForecastResult): number[] {
  const set = new Set(result.periods.map((p) => periodYear(p.period)));
  return [...set].sort();
}
