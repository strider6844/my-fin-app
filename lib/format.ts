// Display formatting helpers. GBP throughout (PRD talks in £).

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  });
  return n < 0 ? `(${s})` : s;
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

// Period helpers. Periods are stored as the first of the month (YYYY-MM-01).
export function periodToLabel(period: string): string {
  // period like "2025-03-01" or "2025-03"
  const [y, m] = period.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// URL slug for a period is YYYY-MM.
export function periodToSlug(period: string): string {
  const [y, m] = period.split("-");
  return `${y}-${m.padStart(2, "0")}`;
}

// Turn a slug (YYYY-MM) or full date into the canonical stored value YYYY-MM-01.
export function slugToPeriod(slug: string): string {
  const [y, m] = slug.split("-");
  return `${y}-${m.padStart(2, "0")}-01`;
}

// Display label for a management line, e.g. "Revenue – Product".
export function lineLabel(v: {
  management_line: string;
  segment: string | null;
}): string {
  return v.segment ? `${v.management_line} – ${v.segment}` : v.management_line;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
