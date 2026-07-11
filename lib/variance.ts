// The deterministic variance engine — pure arithmetic, no AI.
// Given parsed TB rows, the account map, and the budget for a period, it
// produces one variance line per (management_line, segment) and flags lines
// whose absolute variance meets the company's materiality threshold.

import type { AccountMapRow, BudgetLine } from "./types";
import type { ParsedRow } from "./tb-parser";

export interface ComputedActual {
  ingest_row: ParsedRow;
  raw_account_code: string;
  raw_account_name: string;
  amount: number; // stored verbatim from the file (natural sign)
}

export interface ComputedVariance {
  management_line: string;
  segment: string | null;
  actual_amount: number; // sign-adjusted, management presentation
  budget_amount: number;
  variance_amount: number;
  variance_pct: number | null;
  is_flagged: boolean;
  review_status: "unreviewed";
}

export interface EngineResult {
  actuals: ComputedActual[];
  variances: ComputedVariance[];
  unmappedCodes: string[]; // codes present in the file but absent from account_map
  hasBudget: boolean;
}

function key(line: string, segment: string | null): string {
  return `${line}||${segment ?? ""}`;
}

export function computeVariances(params: {
  parsedRows: ParsedRow[];
  accountMap: AccountMapRow[];
  budgetLines: BudgetLine[];
  materialityThreshold: number;
}): EngineResult {
  const { parsedRows, accountMap, budgetLines, materialityThreshold } = params;

  const mapByCode = new Map<string, AccountMapRow>();
  for (const m of accountMap) mapByCode.set(m.raw_account_code.trim(), m);

  const actuals: ComputedActual[] = [];
  const unmapped = new Set<string>();

  // Accumulate sign-adjusted actuals by management line + segment.
  const actualByGroup = new Map<string, { line: string; segment: string | null; amount: number }>();

  for (const row of parsedRows) {
    const code = row.account_code.trim();
    const mapping = mapByCode.get(code);

    // Every parsed row is stored as an actual (audit trail of the raw file),
    // even if it is unmapped — the engine just can't attribute it to a line.
    actuals.push({
      ingest_row: row,
      raw_account_code: code,
      raw_account_name: row.account_name || mapping?.raw_account_name || "",
      amount: row.amount,
    });

    if (!mapping) {
      unmapped.add(code);
      continue;
    }

    const adjusted = row.amount * (mapping.sign_convention ?? 1);
    const k = key(mapping.management_line, mapping.segment);
    const existing = actualByGroup.get(k);
    if (existing) {
      existing.amount += adjusted;
    } else {
      actualByGroup.set(k, {
        line: mapping.management_line,
        segment: mapping.segment,
        amount: adjusted,
      });
    }
  }

  // Index budget by group.
  const budgetByGroup = new Map<string, number>();
  for (const b of budgetLines) {
    const k = key(b.management_line, b.segment);
    budgetByGroup.set(k, (budgetByGroup.get(k) ?? 0) + Number(b.amount));
  }
  const hasBudget = budgetLines.length > 0;

  // Union of all groups seen in actuals or budget.
  const allKeys = new Set<string>([...actualByGroup.keys(), ...budgetByGroup.keys()]);

  const variances: ComputedVariance[] = [];
  for (const k of allKeys) {
    const a = actualByGroup.get(k);
    const budget = budgetByGroup.get(k) ?? 0;
    // Recover line/segment from whichever source has it.
    let line: string;
    let segment: string | null;
    if (a) {
      line = a.line;
      segment = a.segment;
    } else {
      const [l, s] = k.split("||");
      line = l;
      segment = s === "" ? null : s;
    }
    const actual = a?.amount ?? 0;
    const variance = actual - budget;
    const variance_pct = budget !== 0 ? (variance / Math.abs(budget)) * 100 : null;
    // Per the test plan: with no budget loaded, we don't flag anything.
    const is_flagged = hasBudget && Math.abs(variance) >= materialityThreshold;

    variances.push({
      management_line: line,
      segment,
      actual_amount: round2(actual),
      budget_amount: round2(budget),
      variance_amount: round2(variance),
      variance_pct: variance_pct === null ? null : round1(variance_pct),
      is_flagged,
      review_status: "unreviewed",
    });
  }

  // Stable, useful ordering: flagged first, then by |variance| descending.
  variances.sort((x, y) => {
    if (x.is_flagged !== y.is_flagged) return x.is_flagged ? -1 : 1;
    return Math.abs(y.variance_amount) - Math.abs(x.variance_amount);
  });

  return {
    actuals,
    variances,
    unmappedCodes: [...unmapped],
    hasBudget,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Draft commentary stub text for a flagged line (the "AI off" placeholder).
export function stubCommentary(v: ComputedVariance): string {
  const dir = v.variance_amount < 0 ? "below" : "above";
  const abs = Math.abs(v.variance_amount);
  const line = v.segment ? `${v.management_line} – ${v.segment}` : v.management_line;
  return `${line} came in $${abs.toLocaleString("en-US")} ${dir} budget. Draft explanation pending finance review.`;
}
