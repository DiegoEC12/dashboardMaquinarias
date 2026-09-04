import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FilterBar } from "@/components/dash/FilterBar";
import { KpiRow } from "@/components/dash/KpiRow";
import { BenchmarkPanel, RankingPanel } from "@/components/dash/BenchmarkRanking";
import { Heatmap } from "@/components/dash/Heatmap";
import { EvaluatorPanel, StrengthsOpportunities } from "@/components/dash/EvaluatorPanel";
import {
  EMPTY_FILTERS,
  MARCA_PROPIA,
  filterEvaluaciones,
  indicadorAverages,
  localKey,
  scoreOf as scoreForEval,
  type Filters,
} from "@/lib/analytics";
import { useFilters } from "@/lib/mystery/filter-context";

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
          "Explora KPIs, benchmark, ranking de locales, mapa de calor y detalle del evaluador en las evaluaciones de Mystery Shopping.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { dataVersion } = useFilters();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const evs = useMemo(() => filterEvaluaciones(filters), [filters, dataVersion]);
  const benchmarkEvs = useMemo(() => {
    const baseByType = filterEvaluaciones({ ...EMPTY_FILTERS, tipoEvaluacion: filters.tipoEvaluacion });
    const fixedMaquinarias = baseByType.filter((evaluation) => evaluation.concesionaria === MARCA_PROPIA);
    const filteredCompetencia = evs.filter((evaluation) => evaluation.concesionaria !== MARCA_PROPIA);
    return [...fixedMaquinarias, ...filteredCompetencia];
  }, [evs, filters.tipoEvaluacion]);
  const scoreOf = useMemo(
    () => (e: Parameters<typeof scoreForEval>[0]) => {
      if (!filters.indicador?.length) return e.puntaje;
      const scores = filters.indicador.map((indicator) => scoreForEval(e, indicator));
      return scores.reduce((sum, score) => sum + score, 0) / scores.length;
    },
    [filters.indicador],
  );

  const indicadorRows = useMemo(() => {
    const rows = indicadorAverages(evs);
    return filters.indicador?.length
      ? rows.filter((r) => filters.indicador?.includes(String(r.n)))
      : rows;
  }, [evs, filters.indicador]);

  const heatmapLocals = useMemo(() => {
    const map = new Map<
      string,
      {
        representative: (typeof evs)[number];
        representativeId: string;
        bestScore: number;
        scores: number[];
        evIds: string[];
      }
    >();

    for (const evaluation of evs) {
      const key = localKey(evaluation.concesionaria, evaluation.marca, evaluation.ubicacion);
      const score = scoreOf(evaluation);
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          representative: evaluation,
          representativeId: evaluation.id,
          bestScore: score,
          scores: [score],
          evIds: [evaluation.id],
        });
        continue;
      }
      current.scores.push(score);
      if (!current.evIds.includes(evaluation.id)) current.evIds.push(evaluation.id);
      if (score > current.bestScore) {
        current.bestScore = score;
        current.representative = evaluation;
        current.representativeId = evaluation.id;
      }
    }

    return Array.from(map.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => b.bestScore - a.bestScore);
  }, [evs, scoreOf]);

  const heatmapRows = useMemo(
    () =>
      heatmapLocals.map((local) => ({
        ...local.representative,
        id: local.key,
      })),
    [heatmapLocals],
  );

  const evalIdsByHeatmapRow = useMemo(
    () => new Map(heatmapLocals.map((local) => [local.key, local.evIds])),
    [heatmapLocals],
  );

  const representativeByHeatmapRow = useMemo(
    () => new Map(heatmapLocals.map((local) => [local.key, local.representativeId])),
    [heatmapLocals],
  );

  const selectedHeatmapRowId = useMemo(() => {
    if (!selectedId) return null;
    const evaluation = evs.find((item) => item.id === selectedId);
    if (!evaluation) return null;
    return localKey(evaluation.concesionaria, evaluation.marca, evaluation.ubicacion);
  }, [selectedId, evs]);

  const selected = evs.find((e) => e.id === selectedId) ?? null;
  const activeCount =
    ((filters.concesionaria?.length ?? 0) > 0 ? 1 : 0) +
    ((filters.marca?.length ?? 0) > 0 ? 1 : 0) +
    ((filters.ubicacion?.length ?? 0) > 0 ? 1 : 0) +
    ((filters.indicador?.length ?? 0) > 0 ? 1 : 0) +
    ((filters.tipoEvaluacion?.[0] ?? "Ventas") !== "Ventas" ? 1 : 0);

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

      <main className="mx-auto max-w-350 space-y-4 px-4 py-6 lg:px-8">
        <h1 className="sr-only">Panel ejecutivo de Mystery Shopping Maquinarias</h1>

        <KpiRow evs={evs} scoreOf={scoreOf} indicadores={indicadorRows} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="grid items-start gap-4 md:grid-cols-2">
              <BenchmarkPanel evs={benchmarkEvs} delay={60} />

              <RankingPanel
                evs={evs}
                scoreOf={scoreOf}
                selected={selectedId}
                onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
                delay={120}
              />
            </div>
            <Heatmap
              evs={heatmapRows}
              evalIdsByRow={evalIdsByHeatmapRow}
              selected={selectedHeatmapRowId}
              onSelect={(rowId) => {
                const representativeId = representativeByHeatmapRow.get(rowId) ?? rowId;
                setSelectedId(representativeId === selectedId ? null : representativeId);
              }}
              delay={180}
            />
            <StrengthsOpportunities rows={indicadorAverages(evs)} delay={240} />
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
