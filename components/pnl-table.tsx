// Presentational management P&L table. Pure — takes variance lines and renders
// them ordered flagged-first. Optional row-click slot for the report editor.

import { Badge } from "@/components/ui";
import { formatCurrency, formatPct, lineLabel } from "@/lib/format";
import type { VarianceLine } from "@/lib/types";

export { lineLabel };

function StatusBadge({ l }: { l: VarianceLine }) {
  return l.is_flagged ? (
    <Badge tone="red">Flagged</Badge>
  ) : l.review_status === "cleared" ? (
    <Badge tone="green">Cleared</Badge>
  ) : (
    <Badge tone="neutral">OK</Badge>
  );
}

export function PnlTable({
  lines,
  selectedId,
  onWhat,
}: {
  lines: VarianceLine[];
  selectedId?: string | null;
  onWhat?: (id: string) => void;
}) {
  const totalActual = lines.reduce((s, l) => s + Number(l.actual_amount), 0);
  const totalBudget = lines.reduce((s, l) => s + Number(l.budget_amount), 0);
  const totalVar = totalActual - totalBudget;

  // ── Mobile: card per line ─────────────────────────────────────────────────
  const cards = (
    <div className="space-y-2 sm:hidden">
      {lines.map((l) => {
        const negative = Number(l.variance_amount) < 0;
        return (
          <button
            key={l.id}
            onClick={onWhat ? () => onWhat(l.id) : undefined}
            className={`block w-full rounded-lg border p-3 text-left ${
              selectedId === l.id
                ? "border-indigo-300 bg-indigo-50/60"
                : "border-slate-200 bg-white"
            } ${onWhat ? "active:bg-slate-50" : "cursor-default"}`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {lineLabel(l)}
              </span>
              <StatusBadge l={l} />
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs tabular">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Actual
                </div>
                <div className="font-medium">{formatCurrency(Number(l.actual_amount))}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Budget
                </div>
                <div className="text-slate-500">{formatCurrency(Number(l.budget_amount))}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  Variance
                </div>
                <div className={`font-medium ${negative ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(Number(l.variance_amount))}
                  <span className="ml-1 font-normal">
                    {formatPct(l.variance_pct === null ? null : Number(l.variance_pct))}
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
      <div className="flex items-center justify-between rounded-lg border-2 border-slate-200 bg-slate-50 p-3 text-sm font-semibold">
        <span>Net result</span>
        <span className={`tabular ${totalVar < 0 ? "text-red-600" : "text-emerald-600"}`}>
          {formatCurrency(totalActual)}{" "}
          <span className="text-xs font-normal text-[var(--muted)]">
            vs {formatCurrency(totalBudget)}
          </span>
        </span>
      </div>
    </div>
  );

  return (
    <>
      {cards}
      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[640px] text-sm tabular">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
            <th className="px-3 py-2 font-medium">Management line</th>
            <th className="px-3 py-2 text-right font-medium">Actual</th>
            <th className="px-3 py-2 text-right font-medium">Budget</th>
            <th className="px-3 py-2 text-right font-medium">Variance</th>
            <th className="px-3 py-2 text-right font-medium">%</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const negative = Number(l.variance_amount) < 0;
            const clickable = Boolean(onWhat);
            return (
              <tr
                key={l.id}
                onClick={clickable ? () => onWhat!(l.id) : undefined}
                className={`border-b border-slate-100 ${
                  clickable ? "cursor-pointer hover:bg-slate-50" : ""
                } ${selectedId === l.id ? "bg-indigo-50/60" : ""}`}
              >
                <td className="px-3 py-2.5 font-medium text-slate-800">
                  {lineLabel(l)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {formatCurrency(Number(l.actual_amount))}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-500">
                  {formatCurrency(Number(l.budget_amount))}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-medium ${
                    negative ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {formatCurrency(Number(l.variance_amount))}
                </td>
                <td
                  className={`px-3 py-2.5 text-right ${
                    negative ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {formatPct(l.variance_pct === null ? null : Number(l.variance_pct))}
                </td>
                <td className="px-3 py-2.5">
                  {l.is_flagged ? (
                    <Badge tone="red">Flagged</Badge>
                  ) : l.review_status === "cleared" ? (
                    <Badge tone="green">Cleared</Badge>
                  ) : (
                    <Badge tone="neutral">OK</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-semibold">
            <td className="px-3 py-2.5">Net result</td>
            <td className="px-3 py-2.5 text-right">{formatCurrency(totalActual)}</td>
            <td className="px-3 py-2.5 text-right text-slate-500">
              {formatCurrency(totalBudget)}
            </td>
            <td
              className={`px-3 py-2.5 text-right ${
                totalVar < 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {formatCurrency(totalVar)}
            </td>
            <td />
            <td />
          </tr>
        </tfoot>
      </table>
      </div>
    </>
  );
}
