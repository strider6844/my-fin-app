// Minimal dependency-free line chart. Renders one or more series as SVG paths;
// the portion of a series marked forecast is drawn dashed (actual = solid),
// echoing the CFO dashboard's convention.

export interface ChartSeries {
  label: string;
  color: string;
  points: { x: number; value: number; forecast: boolean }[]; // x is an index
}

export function LineChart({
  series,
  height = 220,
  markerLabels,
}: {
  series: ChartSeries[];
  height?: number;
  markerLabels?: { x: number; label: string }[];
}) {
  const width = 760;
  const padL = 56, padR = 16, padT = 12, padB = 26;
  const allVals = series.flatMap((s) => s.points.map((p) => p.value));
  const allX = series.flatMap((s) => s.points.map((p) => p.x));
  if (allVals.length === 0) return <div className="text-sm text-[var(--muted)]">No data.</div>;

  const minV = Math.min(0, ...allVals);
  const maxV = Math.max(0, ...allVals);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const spanV = maxV - minV || 1;
  const spanX = maxX - minX || 1;

  const sx = (x: number) => padL + ((x - minX) / spanX) * (width - padL - padR);
  const sy = (v: number) => padT + (1 - (v - minV) / spanV) * (height - padT - padB);

  // Build a path for a subset of consecutive points.
  const pathFor = (pts: { x: number; value: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(" ");

  const zeroY = sy(0);
  const fmt = (v: number) =>
    Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 560 }}>
        {/* y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const v = minV + t * spanV;
          const y = sy(v);
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#eef2f7" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
                ${fmt(v)}
              </text>
            </g>
          );
        })}
        {/* zero line */}
        <line x1={padL} y1={zeroY} x2={width - padR} y2={zeroY} stroke="#cbd5e1" strokeWidth="1" />

        {/* forecast region marker */}
        {markerLabels?.map((m, i) => (
          <g key={i}>
            <line x1={sx(m.x)} y1={padT} x2={sx(m.x)} y2={height - padB} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={sx(m.x) + 4} y={padT + 10} fontSize="10" fill="#94a3b8">
              {m.label}
            </text>
          </g>
        ))}

        {series.map((s, si) => {
          const actual = s.points.filter((p) => !p.forecast);
          const lastActualIdx = actual.length - 1;
          // forecast path starts from the last actual point for continuity
          const forecast = s.points.filter((p, i) => p.forecast || i === lastActualIdx && actual.length > 0);
          return (
            <g key={si}>
              {actual.length > 0 && (
                <path d={pathFor(actual)} fill="none" stroke={s.color} strokeWidth="2" />
              )}
              {forecast.length > 1 && (
                <path
                  d={pathFor(forecast)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  opacity="0.85"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 px-2 text-xs text-[var(--muted)]">
        {series.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-slate-400" />
          forecast
        </span>
      </div>
    </div>
  );
}
