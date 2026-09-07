import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { fmtPct, fmtPp } from "@/lib/mystery/format";
import { statusFor, type GroupScore, type Status } from "@/lib/mystery/calculations";

/* ---------- Donut de distribución Alto / Medio / Crítico ---------- */

const DONUT_COLORS: Record<string, string> = {
  Alto: "oklch(0.55 0.13 158)",
  Medio: "oklch(0.68 0.13 78)",
  Crítico: "oklch(0.53 0.18 27)",
};

export function ResultDonut({
  data,
}: {
  data: { name: "Alto" | "Medio" | "Crítico"; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center flex-wrap justify-center gap-5">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={DONUT_COLORS[d.name]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [
                `${v} (${total ? ((v / total) * 100).toFixed(0) : 0}%)`,
                name,
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--color-border)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{total}</span>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Evaluaciones
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: DONUT_COLORS[d.name] }}
            />
            <span className="w-14 font-medium text-foreground">{d.name}</span>
            <span className="font-semibold tabular-nums">{d.value}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              ({total ? ((d.value / total) * 100).toFixed(0) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Dumbbell chart: Maquinarias vs Competencia por indicador ---------- */

export interface DumbbellRow {
  id: string;
  label: string;
  maq: number | null;
  comp: number | null;
  brecha: number | null;
  nMaq: number;
  nComp: number;
}

export function DumbbellChart({
  rows,
  onSelect,
}: {
  rows: DumbbellRow[];
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-4 pl-52.5 text-[11px] font-semibold text-muted-foreground max-md:pl-0">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-black" /> Maquinarias
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-500" /> Competencia
        </span>
      </div>
      {rows.map((r) => {
        const maqP = r.maq === null ? null : r.maq * 100;
        const compP = r.comp === null ? null : r.comp * 100;
        const left = Math.min(maqP ?? 0, compP ?? 0);
        const width = Math.abs((maqP ?? 0) - (compP ?? 0));
        const positive = (r.brecha ?? 0) >= 0;
        return (
          <button
            key={r.id}
            onClick={() => onSelect?.(r.id)}
            className="transition-ui group grid grid-cols-[200px_minmax(0,1fr)_64px] items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent max-md:grid-cols-[minmax(0,1fr)] max-md:gap-1"
            title={`Indicador: ${r.label}\nMaquinarias: ${fmtPct(r.maq)}\nCompetencia: ${fmtPct(r.comp)}\nBrecha: ${fmtPp(r.brecha)}\nEvaluaciones: ${r.nMaq} vs ${r.nComp}`}
          >
            <span className="truncate text-[13px] font-medium text-foreground group-hover:text-primary">
              {r.label}
            </span>
            <span className="relative block h-5 max-md:ml-0">
              <span className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-border" />
              {[0, 25, 50, 75, 100].map((t) => (
                <span
                  key={t}
                  className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-border"
                  style={{ left: `${t}%` }}
                />
              ))}
              {maqP !== null && compP !== null && (
                <span
                  className={cn(
                    "absolute top-1/2 h-1.25 -translate-y-1/2 rounded-full",
                    positive ? "bg-success/50" : "bg-danger/50",
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              )}
              {maqP !== null && (
                <span
                  className={cn(
                    "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm",
                    "bg-black"
                  )}
                  style={{ left: `${maqP}%` }}
                />
              )}
              {compP !== null && (
                <span
                  className={cn(
                    "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-sm",
                    "bg-gray-500"
                  )}
                  style={{ left: `${compP}%` }}
                />
              )}
            </span>
            <span
              className={cn(
                "text-right text-[13px] font-bold tabular-nums max-md:text-left",
                r.brecha === null
                  ? "text-muted-foreground"
                  : positive
                    ? "text-success"
                    : "text-danger",
              )}
            >
              {fmtPp(r.brecha)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function RankingBars({
  rows,
  reference,
  selectedKey,
  onSelect,
}: {
  rows: GroupScore[];
  reference: number | null;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}) {
  const max = useMemo(() => Math.max(0.0001, ...rows.map((r) => r.score ?? 0)), [rows]);
  return (
    <div className="flex flex-col">
      {rows.map((r, i) => {
        const status: Status = statusFor(r.score);
        return (
          <button
            key={r.key}
            onClick={() => onSelect?.(r.key)}
            className={cn(
              "transition-ui group grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent",
              selectedKey === r.key && "bg-accent ring-1 ring-primary/30",
            )}
            title={`${r.label}\nPuntaje: ${fmtPct(r.score)}\nBrecha vs referencia: ${fmtPp(r.brecha)}\nEvaluaciones: ${r.n}`}
          >
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold tabular-nums",
                i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-foreground">
                  {r.label}
                  {r.marca && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {r.marca}
                      {r.ubicacion ? ` · ${r.ubicacion}` : ""}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-sm font-bold tabular-nums">{fmtPct(r.score)}</span>
                  <span
                    className={cn(
                      "w-18.5 text-right text-xs font-semibold tabular-nums",
                      r.brecha === null
                        ? "text-muted-foreground"
                        : r.brecha >= 0
                          ? "text-success"
                          : "text-danger",
                    )}
                  >
                    {fmtPp(r.brecha)}
                  </span>
                </span>
              </span>
              <span className="relative mt-1.5 block h-2 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-200",
                    status === "alto"
                      ? "bg-success"
                      : status === "medio"
                        ? "bg-warning"
                        : status === "critico"
                          ? "bg-danger"
                          : "bg-neutral-status/40",
                  )}
                  style={{ width: `${((r.score ?? 0) / max) * 100}%` }}
                />
                {reference !== null && (
                  <span
                    className="absolute top-0 h-full w-0.5 bg-foreground/50"
                    style={{ left: `${(reference / max) * 100}%` }}
                    title={`Referencia: ${fmtPct(reference)}`}
                  />
                )}
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                {r.n} evaluación{r.n === 1 ? "" : "es"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function Heatmap({
  rows,
  columns,
  cell,
  benchmark,
  onRowSelect,
  onColSelect,
  selectedRow,
  showNumericHeaders = false,
  compact = false,
  showHoverFooter = false,
  maxViewportHeightClass = "max-h-105",
}: {
  rows: { key: string; label: string; sub?: string }[];
  columns: { id: string; label: string }[];
  cell: (rowKey: string, colId: string) => HeatmapCell;
  benchmark: (colId: string) => number | null;
  onRowSelect?: (key: string) => void;
  onColSelect?: (id: string) => void;
  selectedRow?: string | null;
  showNumericHeaders?: boolean;
  compact?: boolean;
  showHoverFooter?: boolean;
  maxViewportHeightClass?: string;
}) {
  const [hovered, setHovered] = useState<{
    rowLabel: string;
    rowSub: string | undefined;
    columnLabel: string;
    value: number | null;
  } | null>(null);

  return (
    <div>
      <div className={cn("overflow-auto scrollbar-thin pr-1", maxViewportHeightClass)}>
        <table
          className={cn(
            "w-full border-separate",
            compact ? "border-spacing-0.5" : "border-spacing-1",
          )}
        >
          <thead>
            <tr>
              <th
                className={cn(
                  "sticky top-0 left-0 z-20 bg-background p-1 text-left font-semibold tracking-wide text-muted-foreground uppercase",
                  compact ? "min-w-36 text-[10px]" : "min-w-45 text-[11px]",
                )}
              >
                Local
              </th>
              {columns.map((c, index) => (
                <th
                  key={c.id}
                  className={cn(
                    "sticky top-0 z-10 bg-background p-1 align-bottom",
                    compact ? "min-w-15.5" : "min-w-21.5",
                  )}
                >
                  <button
                    onClick={() => onColSelect?.(c.id)}
                    className={cn(
                      "transition-ui mx-auto block leading-tight font-semibold text-muted-foreground uppercase hover:text-primary",
                      compact ? "max-w-16 text-[10px]" : "max-w-25 text-[10px]",
                    )}
                    title={c.label}
                  >
                    {showNumericHeaders ? (
                      <span>{index + 1}</span>
                    ) : (
                      <span className="line-clamp-3">{c.label}</span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="sticky left-0 z-10 bg-background p-1">
                  <button
                    onClick={() => onRowSelect?.(r.key)}
                    className={cn(
                      "transition-ui block w-full truncate rounded-md px-2 text-left font-medium hover:bg-accent",
                      compact ? "py-0.5 text-[10px]" : "py-1.5 text-[12px]",
                      selectedRow === r.key ? "bg-accent text-primary" : "text-foreground",
                    )}
                  >
                    {r.label}
                    {r.sub && (
                      <span
                        className={cn(
                          "block font-normal text-muted-foreground",
                          compact ? "text-[9px]" : "text-[10px]",
                        )}
                      >
                        {r.sub}
                      </span>
                    )}
                  </button>
                </td>
                {columns.map((c) => {
                  const { value, n } = cell(r.key, c.id);
                  const status = statusFor(value);
                  const bm = benchmark(c.id);
                  const gap = value !== null && bm !== null ? value - bm : null;
                  const bg =
                    status === "alto"
                      ? "bg-success/15 text-success"
                      : status === "medio"
                        ? "bg-warning/15 text-warning"
                        : status === "critico"
                          ? "bg-danger/15 text-danger"
                          : "bg-muted text-muted-foreground/60";
                  return (
                    <td key={c.id}>
                      <button
                        onClick={() => {
                          onRowSelect?.(r.key);
                          onColSelect?.(c.id);
                        }}
                        onMouseEnter={() =>
                          setHovered({
                            rowLabel: r.label,
                            rowSub: r.sub,
                            columnLabel: c.label,
                            value,
                          })
                        }
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() =>
                          setHovered({
                            rowLabel: r.label,
                            rowSub: r.sub,
                            columnLabel: c.label,
                            value,
                          })
                        }
                        className={cn(
                          "transition-ui flex w-full items-center justify-center rounded-md font-bold tabular-nums hover:ring-2 hover:ring-primary/40",
                          compact ? "h-7 text-[10px]" : "h-10 text-[12px]",
                          bg,
                        )}
                        title={`${r.label}\n${c.label}\nResultado: ${fmtPct(value)}\nBenchmark: ${fmtPct(bm)}\nBrecha: ${fmtPp(gap)}\nEvaluaciones: ${n}`}
                      >
                        {value === null ? "—" : fmtPct(value, 0)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showHoverFooter && (
        <div
          className={cn(
            "pointer-events-none mt-3 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs transition-all duration-200",
            hovered ? "opacity-100" : "opacity-60",
          )}
        >
          {hovered ? (
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-semibold">{hovered.rowLabel}</span>
              {hovered.rowSub ? (
                <span className="text-muted-foreground">{hovered.rowSub}</span>
              ) : null}
              <span className="text-muted-foreground">·</span>
              <span>{hovered.columnLabel}</span>
              <span className="font-display font-bold">{fmtPct(hovered.value)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Los indicadores 1 a 12 siguen el orden del formulario de evaluación.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function MiniBars({ rows }: { rows: { label: string; value: number | null; n: number }[] }) {
  const sorted = [...rows].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  const max = Math.max(0.0001, ...sorted.map((r) => r.value ?? 0));
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((r) => {
        const status = statusFor(r.value);
        return (
          <div
            key={r.label}
            className="grid grid-cols-[150px_minmax(0,1fr)_64px] items-center gap-3 max-md:grid-cols-[110px_minmax(0,1fr)_58px]"
            title={`${r.label}: ${fmtPct(r.value)} (${r.n} evaluaciones)`}
          >
            <span className="truncate text-[12px] font-medium text-foreground">{r.label}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full rounded-full",
                  status === "alto"
                    ? "bg-success"
                    : status === "medio"
                      ? "bg-warning"
                      : status === "critico"
                        ? "bg-danger"
                        : "bg-neutral-status/40",
                )}
                style={{ width: `${((r.value ?? 0) / max) * 100}%` }}
              />
            </span>
            <span
              className={cn(
                "text-right text-[12px] font-bold tabular-nums",
                r.value !== null
                  ? status === "alto"
                    ? "text-success"
                    : status === "medio"
                      ? "text-warning"
                      : "text-danger"
                  : "text-muted-foreground",
              )}
            >
              {r.value === null ? "Sin datos" : fmtPct(r.value, 0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface HeatmapCell {
  value: number | null;
  n: number;
}
