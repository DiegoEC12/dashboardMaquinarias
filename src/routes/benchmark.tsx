import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/mystery/page-header";
import { EmptyState, GapChip, SectionHeader } from "@/components/mystery/primitives";
import { DumbbellChart, ResultDonut, type DumbbellRow } from "@/components/mystery/charts";
import { useFilters } from "@/lib/mystery/filter-context";
import {
  getScopes,
  calculateBenchmark,
  calculateIndicatorPerformance,
  benchmarkSentence,
} from "@/lib/mystery/calculations";
import { fmtPct, fmtPp } from "@/lib/mystery/format";
import { cn } from "@/lib/utils";
import CompactFilterControls from "@/components/dash/CompactFilterControls";

export const Route = createFileRoute("/benchmark")({
  head: () => ({
    meta: [{ title: "Benchmark | Maquinarias" }],
  }),
  component: BenchmarkPage,
});

function BenchmarkPage() {
  const { filters, openIndicador } = useFilters();
  const [sort, setSort] = useState<"abs" | "ventaja-maq" | "ventaja-comp" | "mayor" | "menor">("abs");

  const scopes = useMemo(() => getScopes(filters), [filters]);
  const bench = useMemo(() => calculateBenchmark(scopes), [scopes]);
  const indicators = useMemo(() => calculateIndicatorPerformance(scopes), [scopes]);

  const rows: DumbbellRow[] = useMemo(() => {
    const base = indicators.map((i) => ({
      id: i.id,
      label: i.nombre,
      maq: i.maquinarias,
      comp: i.competencia,
      brecha: i.brecha,
      nMaq: scopes.maquinarias.length,
      nComp: scopes.competencia.length,
    }));
    const val = (r: DumbbellRow) => {
      switch (sort) {
        case "abs":
          return Math.abs(r.brecha ?? 0);
        case "ventaja-maq":
          return r.brecha ?? -Infinity;
        case "ventaja-comp":
          return -(r.brecha ?? Infinity);
        case "mayor":
          return r.maq ?? -Infinity;
        case "menor":
          return -(r.maq ?? Infinity);
      }
    };
    return base.sort((a, b) => val(b) - val(a));
  }, [indicators, sort, scopes]);

  const positivas = useMemo(
    () =>
      indicators
        .filter((i) => i.brecha !== null && i.brecha > 0)
        .sort((a, b) => (b.brecha ?? 0) - (a.brecha ?? 0))
        .slice(0, 5),
    [indicators],
  );
  const negativas = useMemo(
    () =>
      indicators
        .filter((i) => i.brecha !== null && i.brecha < 0)
        .sort((a, b) => (a.brecha ?? 0) - (b.brecha ?? 0))
        .slice(0, 5),
    [indicators],
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Benchmark" description={benchmarkSentence(bench)} />
      <CompactFilterControls />

      <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 lg:px-8">
        {scopes.selection.length === 0 ? (
          <div className="p-5 md:p-8">
            <EmptyState />
          </div>
        ) : (
          <div className="flex flex-col gap-8 p-5 md:p-8">
            {/* Hero benchmark */}
            <section className="rounded-xl border border-border bg-card p-6 md:p-8">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 md:gap-10">
                <div className="text-center md:text-right">
                  <p className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">Maquinarias</p>
                  <p className="mt-2 text-5xl font-black text-primary tabular-nums md:text-6xl">{fmtPct(bench.maquinarias)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{bench.nMaquinarias} evaluaciones · {scopes.maquinariasLabel}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">VS</span>
                  <GapChip gap={bench.brecha} className="text-base" />
                </div>
                <div className="text-center md:text-left">
                  <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">Competencia</p>
                  <p className="mt-2 text-5xl font-black text-foreground/60 tabular-nums md:text-6xl">{fmtPct(bench.competencia)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{bench.nCompetencia} evaluaciones · {scopes.competenciaLabel}</p>
                </div>
              </div>
              <p className="mx-auto mt-6 max-w-lg rounded-lg bg-accent px-4 py-2.5 text-center text-[13px] font-medium text-accent-foreground">{benchmarkSentence(bench)}</p>
            </section>

            {/* Benchmark por indicador */}
            <section className="rounded-xl border border-border bg-card p-5 md:p-6">
              <SectionHeader
                title="Benchmark por indicador"
                description="Posición de Maquinarias frente a la competencia en cada indicador."
                action={
                  <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="transition-ui h-8 rounded-md border border-input bg-card px-2 text-[13px] font-medium shadow-xs outline-none focus:border-ring">
                    <option value="abs">Brecha absoluta</option>
                    <option value="ventaja-maq">Mayor ventaja Maquinarias</option>
                    <option value="ventaja-comp">Mayor ventaja competencia</option>
                    <option value="mayor">Mayor resultado</option>
                    <option value="menor">Menor resultado</option>
                  </select>
                }
              />
              <DumbbellChart rows={rows} onSelect={openIndicador} />
            </section>

            {/* Brechas positivas / negativas */}
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <GapList title="Dónde Maquinarias supera a la competencia" description="Top 5 brechas positivas" tone="success" rows={positivas} onSelect={openIndicador} />
              <GapList title="Dónde debemos cerrar brechas" description="Top 5 indicadores donde la competencia supera a Maquinarias" tone="danger" rows={negativas} onSelect={openIndicador} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function GapList({
  title,
  description,
  tone,
  rows,
  onSelect,
}: {
  title: string;
  description: string;
  tone: "success" | "danger";
  rows: { id: string; nombre: string; brecha: number | null; maquinarias: number | null; competencia: number | null }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <SectionHeader title={title} description={description} />
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">No hay brechas {tone === "success" ? "positivas" : "negativas"} en el universo seleccionado.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id}>
              <button onClick={() => onSelect(r.id)} className="transition-ui group flex w-full items-center justify-between gap-3 py-3 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-foreground group-hover:text-primary">{r.nombre}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">Maq. {fmtPct(r.maquinarias)} · Comp. {fmtPct(r.competencia)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className={cn("text-sm font-bold tabular-nums", tone === "success" ? "text-success" : "text-danger")}>{fmtPp(r.brecha)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
