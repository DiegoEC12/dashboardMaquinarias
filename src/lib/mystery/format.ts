export function fmtPct(v: number | null | undefined, digits = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtPp(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v * 100).toFixed(1)} pp`;
}
