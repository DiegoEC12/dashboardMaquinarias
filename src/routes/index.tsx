import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FilterBar } from "@/components/dash/FilterBar";
import { KpiRow } from "@/components/dash/KpiRow";
import { BenchmarkPanel, RankingPanel } from "@/components/dash/BenchmarkRanking";
import { Heatmap } from "@/components/dash/Heatmap";
import { CriticalQuestions } from "@/components/dash/CriticalQuestions";
import { EvaluatorPanel, StrengthsOpportunities } from "@/components/dash/EvaluatorPanel";
import {
  EMPTY_FILTERS,
  filterEvaluaciones,
  indicadorAverages,
  preguntasAgregadas,
  scoreOf as scoreForEval,
  type Filters,
} from "@/lib/analytics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mystery Shopping Maquinarias | Panel Ejecutivo" },
      {
        name: "description",
        content:
          "Panel ejecutivo de Mystery Shopping Maquinarias: KPIs, benchmark vs. competencia, ranking de locales, mapa de calor y comentarios del evaluador.",
      },
      { property: "og:title", content: "Mystery Shopping Maquinarias | Panel Ejecutivo" },
      {
        property: "og:description",
        content:
          "Explora KPIs, benchmark, ranking de locales, mapa de calor y preguntas críticas de las evaluaciones de Mystery Shopping.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const evs = useMemo(() => filterEvaluaciones(filters), [filters]);
  const scoreOf = useMemo(() => (e: Parameters<typeof scoreForEval>[0]) => scoreForEval(e, filters.indicador), [filters.indicador]);

  const indicadorRows = useMemo(() => {
    const rows = indicadorAverages(evs);
    return filters.indicador === "all" ? rows : rows.filter((r) => String(r.n) === filters.indicador);
  }, [evs, filters.indicador]);

  const preguntas = useMemo(() => {
    const list = preguntasAgregadas(evs);
    return filters.indicador === "all" ? list : list.filter((p) => String(p.ind) === filters.indicador);
  }, [evs, filters.indicador]);

  const selected = evs.find((e) => e.id === selectedId) ?? null;
  const activeCount = Object.values(filters).filter((v) => v !== "all").length;

  const handleChange = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setSelectedId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <FilterBar
        filters={filters}
        onChange={handleChange}
        onReset={() => {
          setFilters(EMPTY_FILTERS);
          setSelectedId(null);
        }}
        activeCount={activeCount}
      />

      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-6 lg:px-8">
        <h1 className="sr-only">Panel ejecutivo de Mystery Shopping Maquinarias</h1>

        <KpiRow evs={evs} scoreOf={scoreOf} indicadores={indicadorRows} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="grid items-start gap-4 md:grid-cols-2">
              <BenchmarkPanel evs={evs} delay={60} />
              <RankingPanel
                evs={evs}
                scoreOf={scoreOf}
                selected={selectedId}
                onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
                delay={120}
              />
            </div>
            <Heatmap
              evs={evs}
              selected={selectedId}
              onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
              delay={180}
            />
            <StrengthsOpportunities rows={indicadorAverages(evs)} delay={240} />
            <CriticalQuestions items={preguntas} delay={300} />
          </div>

          <div className="lg:col-span-1">
            <EvaluatorPanel evs={evs} selected={selected} delay={160} />
          </div>
        </div>

        <footer className="pt-2 text-center text-xs text-muted-foreground">
          Maquinarias · Comprometidos de por vida — Base consolidada de Mystery Shopping
        </footer>
      </main>
    </div>
  );
}
