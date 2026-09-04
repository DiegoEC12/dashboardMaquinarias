import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ChevronRight, X } from "lucide-react";
import { PageHeader } from "@/components/mystery/page-header";
import { EmptyState, GapChip, SectionHeader, StatusBadge } from "@/components/mystery/primitives";
import { Heatmap, MiniBars, RankingBars } from "@/components/mystery/charts";
import {
  calculateBenchmark,
  calculateWeightedScore,
  availableIndicators,
  getScopes,
  groupScores,
  indicatorScore,
  statusFor,
  type GroupScore,
} from "@/lib/mystery/calculations";
import { localKey } from "@/lib/analytics";
import { dataset } from "@/lib/mystery/dataset";
import { fmtPct } from "@/lib/mystery/format";
import { useFilters } from "@/lib/mystery/filter-context";
import { cn } from "@/lib/utils";
import CompactFilterControls from "@/components/dash/CompactFilterControls";

export const Route = createFileRoute("/concesionarias")({
  head: () => ({
    meta: [
      { title: "Concesionarias | Maquinarias" },
      {
        name: "description",
        content: "Ranking de concesionarias y locales, mapa por indicador y drill-down.",
      },
    ],
  }),
  component: ConcesionariasPage,
});

type SortMode = "mayor" | "menor" | "brecha-pos" | "brecha-neg";
type Level = "concesionaria" | "marca" | "ubicacion" | "local";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "mayor", label: "Mayor puntaje" },
  { value: "menor", label: "Menor puntaje" },
  { value: "brecha-pos", label: "Mayor brecha positiva" },
  { value: "brecha-neg", label: "Mayor brecha negativa" },
];

function ConcesionariasPage() {
  const { filters, openIndicador, openEvaluacion, dataVersion } = useFilters();
  const [sort, setSort] = useState<SortMode>("mayor");
  const [drill, setDrill] = useState<{
    concesionaria?: string;
    marca?: string;
    ubicacion?: string;
  }>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    setDrill({});
    setSelectedKey(null);
  }, [dataVersion, filters]);

  void dataVersion;
  const scopes = getScopes(filters);
  const benchmark = useMemo(() => calculateBenchmark(scopes), [scopes]);
  const reference = benchmark.competencia;

  const level: Level = !drill.concesionaria
    ? "concesionaria"
    : !drill.marca
      ? "marca"
      : !drill.ubicacion
        ? "ubicacion"
        : "local";

  const drilled = useMemo(
    () =>
      scopes.selection.filter(
        (e) =>
          (!drill.concesionaria || e.concesionaria === drill.concesionaria) &&
          (!drill.marca || e.marca === drill.marca) &&
          (!drill.ubicacion || e.ubicacion === drill.ubicacion),
      ),
    [scopes, drill],
  );

  const ranking: GroupScore[] = useMemo(() => {
    const rows =
      level === "concesionaria"
        ? groupScores(
            drilled,
            (e) => ({
              key: e.concesionaria,
              label: e.concesionaria,
              extra: { tipoEmpresa: e.tipoEmpresa },
            }),
            reference,
          )
        : level === "marca"
          ? groupScores(drilled, (e) => ({ key: e.marca, label: e.marca }), reference)
          : level === "ubicacion"
            ? groupScores(drilled, (e) => ({ key: e.ubicacion, label: e.ubicacion }), reference)
            : groupScores(
                drilled,
                (e) => ({
                  key: localKey(e.concesionaria, e.marca, e.ubicacion),
                  label: `${e.concesionaria} · ${e.marca}`,
                  extra: { marca: e.marca, ubicacion: e.ubicacion },
                }),
                reference,
              );
    const val = (r: GroupScore) => {
      switch (sort) {
        case "mayor":
          return r.score ?? -Infinity;
        case "menor":
          return -(r.score ?? Infinity);
        case "brecha-pos":
          return r.brecha ?? -Infinity;
        case "brecha-neg":
          return -(r.brecha ?? Infinity);
      }
    };
    return rows.sort((a, b) => val(b) - val(a));
  }, [drilled, level, reference, sort]);

  const visibleRanking = useMemo(
    () => (level === "local" ? ranking.slice(0, 5) : ranking),
    [ranking, level],
  );

  const heatRows = useMemo(() => {
    const map = new Map<string, { key: string; label: string; sub: string; ids: string[] }>();
    for (const e of drilled) {
      const key = localKey(e.concesionaria, e.marca, e.ubicacion);
      const cur = map.get(key) ?? {
        key,
        label: e.concesionaria,
        sub: `${e.marca} · ${e.ubicacion}`,
        ids: [],
      };
      if (!cur.ids.includes(e.id)) cur.ids.push(e.id);
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => {
      const sa = calculateWeightedScore(a.ids) ?? 0;
      const sb = calculateWeightedScore(b.ids) ?? 0;
      return sb - sa;
    });
  }, [drilled]);

  const heatColumns = useMemo(() => {
    return availableIndicators(scopes.selection.map((evaluation) => evaluation.id)).map(
      (indicator) => ({
        id: indicator.id,
        label: indicator.nombre,
      }),
    );
  }, [dataVersion, scopes.selection]);

  const compIds = scopes.competencia.map((e) => e.id);

  const heatBenchmarkByIndicator = useMemo(
    () => new Map(heatColumns.map((column) => [column.id, indicatorScore(compIds, column.id)])),
    [compIds, heatColumns],
  );

  const heatMatrix = useMemo(() => {
    const matrix = new Map<string, Map<string, { value: number | null; n: number }>>();
    for (const row of heatRows) {
      const idSet = new Set(row.ids);
      const byIndicator = new Map<string, { sum: number; weight: number; n: number }>();

      for (const result of dataset.indicatorResults) {
        if (!idSet.has(result.idEvaluacion) || result.resultado === null) continue;
        const current = byIndicator.get(result.idIndicador) ?? { sum: 0, weight: 0, n: 0 };
        current.sum += result.resultado * result.peso;
        current.weight += result.peso;
        current.n += 1;
        byIndicator.set(result.idIndicador, current);
      }

      const rowCells = new Map<string, { value: number | null; n: number }>();
      for (const column of heatColumns) {
        const aggregate = byIndicator.get(column.id);
        rowCells.set(column.id, {
          value: aggregate && aggregate.weight > 0 ? aggregate.sum / aggregate.weight : null,
          n: aggregate?.n ?? 0,
        });
      }
      matrix.set(row.key, rowCells);
    }
    return matrix;
  }, [heatRows, heatColumns]);

  const selected = useMemo(
    () => ranking.find((r) => r.key === selectedKey) ?? null,
    [ranking, selectedKey],
  );

  const selectedEvals = useMemo(() => {
    if (!selected) return [];
    if (level === "concesionaria") return drilled.filter((e) => e.concesionaria === selected.key);
    if (level === "marca") return drilled.filter((e) => e.marca === selected.key);
    if (level === "ubicacion") return drilled.filter((e) => e.ubicacion === selected.key);
    return drilled.filter((e) => localKey(e.concesionaria, e.marca, e.ubicacion) === selected.key);
  }, [selected, level, drilled]);

  const selectedIndicators = useMemo(() => {
    const ids = selectedEvals.map((e) => e.id);
    return availableIndicators(scopes.selection.map((evaluation) => evaluation.id)).map((i) => ({
      label: i.nombre,
      value: indicatorScore(ids, i.id),
      n: ids.length,
    }));
  }, [selectedEvals, scopes.selection]);

  function handleRankingSelect(key: string) {
    setSelectedKey(key === selectedKey ? null : key);
  }

  function handleDrillDown() {
    if (!selected) return;
    if (level === "concesionaria") setDrill({ concesionaria: selected.key });
    else if (level === "marca") setDrill((d) => ({ ...d, marca: selected.key }));
    else if (level === "ubicacion") setDrill((d) => ({ ...d, ubicacion: selected.key }));
    else if (level === "local") {
      const evaluationId = selectedEvals[0]?.id;
      if (evaluationId) openEvaluacion(evaluationId);
    }
    setSelectedKey(null);
  }

  const crumbs: { label: string; onClick: () => void }[] = [
    {
      label: "Concesionarias",
      onClick: () => {
        setDrill({});
        setSelectedKey(null);
      },
    },
  ];
  if (drill.concesionaria)
    crumbs.push({
      label: drill.concesionaria,
      onClick: () => {
        setDrill({ concesionaria: drill.concesionaria as string });
        setSelectedKey(null);
      },
    });
  if (drill.marca)
    crumbs.push({
      label: drill.marca,
      onClick: () => {
        setDrill({ concesionaria: drill.concesionaria as string, marca: drill.marca as string });
        setSelectedKey(null);
      },
    });
  if (drill.ubicacion) crumbs.push({ label: drill.ubicacion, onClick: () => {} });

  const levelLabel = {
    concesionaria: "concesionaria",
    marca: "marca",
    ubicacion: "ubicación",
    local: "local",
  }[level];

  return (
    <>
      <PageHeader
        title="Concesionarias"
        description="¿Dónde están los mejores y peores resultados? Ranking, mapa y drill-down."
      />
      <CompactFilterControls />

      <div className="flex flex-col gap-6 p-5 md:p-8">
        {scopes.selection.length === 0 && (
          <section className="rounded-xl border border-dashed border-border bg-card p-5">
            <EmptyState />
          </section>
        )}

        <nav className="flex flex-wrap items-center gap-1 text-[13px]">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
              <button
                onClick={c.onClick}
                disabled={i === crumbs.length - 1}
                className={cn(
                  "transition-ui rounded px-1.5 py-0.5",
                  i === crumbs.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-primary",
                )}
              >
                {c.label}
              </button>
            </span>
          ))}
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {drilled.length} evaluaciones
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <section className="rounded-xl border border-border bg-card p-5">
            <SectionHeader
              title={`Ranking por ${levelLabel}`}
              description={`Barra vertical = referencia competencia (${fmtPct(reference)}).`}
              action={
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="transition-ui h-8 rounded-md border border-input bg-card px-2 text-[13px] font-medium shadow-xs outline-none focus:border-ring"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              }
            />
            {visibleRanking.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No hay datos para el ranking con los filtros actuales.
              </p>
            ) : (
              <RankingBars
                rows={visibleRanking}
                reference={reference}
                selectedKey={selectedKey}
                onSelect={handleRankingSelect}
              />
            )}
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            {selected ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-bold text-foreground">
                      {selected.label}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {selectedEvals.length} evaluación{selectedEvals.length === 1 ? "" : "es"}
                      {selected.marca ? ` · ${selected.marca}` : ""}
                      {selected.ubicacion ? ` · ${selected.ubicacion}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedKey(null)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                    aria-label="Cerrar panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 border-y border-border py-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Puntaje
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tabular-nums">
                      {fmtPct(selected.score)}
                    </p>
                    <StatusBadge status={statusFor(selected.score)} className="mt-1.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Benchmark
                    </p>
                    <p className="mt-0.5 text-2xl font-bold text-muted-foreground tabular-nums">
                      {fmtPct(reference)}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {scopes.competenciaLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Brecha
                    </p>
                    <div className="mt-1.5">
                      <GapChip gap={selected.brecha} className="text-lg" />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <SectionHeader title="Desempeño por indicador" className="mb-3" />
                  <MiniBars rows={selectedIndicators} />
                </div>

                <button
                  onClick={handleDrillDown}
                  className="transition-ui mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {level === "local"
                    ? "Ver detalle de una visita"
                    : `Profundizar en ${selected.label}`}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex h-full min-h-70 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-foreground">
                  {drilled.length === 0
                    ? "No hay datos para detallar"
                    : "Selecciona un elemento del ranking"}
                </p>
                <p className="max-w-xs text-[13px] text-muted-foreground">
                  {drilled.length === 0
                    ? "Ajusta los filtros globales para visualizar resultados y luego selecciona un elemento."
                    : "Verás su puntaje, benchmark, brecha y desempeño por indicador, con opción de profundizar hasta el local."}
                </p>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <SectionHeader
            title="Mapa por locales"
            description="Explora el resultado por indicador en cada local del universo seleccionado."
          />
          {drilled.length === 0 ? (
            <EmptyState />
          ) : (
            <Heatmap
              rows={heatRows.map((row) => ({ key: row.key, label: row.label, sub: row.sub }))}
              columns={heatColumns}
              cell={(rowKey, colId) => heatMatrix.get(rowKey)?.get(colId) ?? { value: null, n: 0 }}
              benchmark={(colId) => heatBenchmarkByIndicator.get(colId) ?? null}
              selectedRow={level === "local" ? selectedKey : null}
              showNumericHeaders
              compact
              showHoverFooter
              onRowSelect={(rowKey) => {
                const row = heatRows.find((item) => item.key === rowKey);
                if (level === "local") {
                  setSelectedKey(rowKey);
                  return;
                }
                if (row?.ids[0]) openEvaluacion(row.ids[0]);
              }}
              onColSelect={(id) => openIndicador(id)}
            />
          )}
        </section>
      </div>
    </>
  );
}
