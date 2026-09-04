import { useCallback, useMemo, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/mystery/page-header";
import { EmptyState, GapChip, SectionHeader } from "@/components/mystery/primitives";
import { DumbbellChart, type DumbbellRow } from "@/components/mystery/charts";
import { useFilters } from "@/lib/mystery/filter-context";
import {
  calculateBenchmark,
  calculateIndicatorPerformance,
  benchmarkSentence,
  type Scopes,
} from "@/lib/mystery/calculations";
import { fmtPct, fmtPp } from "@/lib/mystery/format";
import { cn } from "@/lib/utils";
import { dataset } from "@/lib/mystery/dataset";
import { MultiFilterSelect } from "@/components/dash/MultiFilterSelect";
import { Button } from "@/components/ui/button";
import { coerceSingleTipoEvaluacion, includesTipoEvaluacion } from "@/lib/tipo-evaluacion";

type BenchmarkFilters = {
  marca: string[] | null;
  ubicacion: string[] | null;
  tipoEvaluacion: string[] | null;
};

type CompetenciaFilters = {
  concesionaria: string[] | null;
  marca: string[] | null;
  ubicacion: string[] | null;
};

const EMPTY_BENCHMARK_FILTERS: BenchmarkFilters = {
  marca: null,
  ubicacion: null,
  tipoEvaluacion: ["Ventas"],
};

const EMPTY_COMPETENCIA_FILTERS: CompetenciaFilters = {
  concesionaria: null,
  marca: null,
  ubicacion: null,
};

export const Route = createFileRoute("/benchmark")({
  head: () => ({
    meta: [{ title: "Benchmark | Maquinarias" }],
  }),
  component: BenchmarkPage,
});

function BenchmarkPage() {
  const { openIndicador, dataVersion } = useFilters();
  const [sort, setSort] = useState<"abs" | "ventaja-maq" | "ventaja-comp" | "mayor" | "menor">(
    "abs",
  );
  const [benchmarkFilters, setBenchmarkFilters] =
    useState<BenchmarkFilters>(EMPTY_BENCHMARK_FILTERS);
  const [competenciaFilters, setCompetenciaFilters] =
    useState<CompetenciaFilters>(EMPTY_COMPETENCIA_FILTERS);

  void dataVersion;
  const maquinariasBase = dataset.evaluations.filter(
    (evaluation) => evaluation.tipoEmpresa === "MAQUINARIAS",
  );
  const competenciaBase = dataset.evaluations.filter(
    (evaluation) => evaluation.tipoEmpresa === "COMPETENCIA",
  );

  const matchBenchmarkFilters = useCallback(
    (evaluation: (typeof dataset.evaluations)[number], filters: BenchmarkFilters) =>
      (!filters.marca?.length || filters.marca.includes(evaluation.marca)) &&
      (!filters.ubicacion?.length || filters.ubicacion.includes(evaluation.ubicacion)) &&
      includesTipoEvaluacion(filters.tipoEvaluacion, evaluation.tipoEvaluacion),
    [],
  );

  const matchCompetenciaFilters = useCallback(
    (evaluation: (typeof dataset.evaluations)[number], filters: CompetenciaFilters) =>
      (!filters.concesionaria?.length ||
        filters.concesionaria.includes(evaluation.concesionaria)) &&
      (!filters.marca?.length || filters.marca.includes(evaluation.marca)) &&
      (!filters.ubicacion?.length || filters.ubicacion.includes(evaluation.ubicacion)),
    [],
  );

  const matchContextFilters = useCallback(
    (
      evaluation: (typeof dataset.evaluations)[number],
      filters: Pick<BenchmarkFilters, "ubicacion" | "tipoEvaluacion">,
    ) =>
      (!filters.ubicacion?.length || filters.ubicacion.includes(evaluation.ubicacion)) &&
      includesTipoEvaluacion(filters.tipoEvaluacion, evaluation.tipoEvaluacion),
    [],
  );

  const benchmarkOptions = useMemo(() => {
    const optionsFor = (key: keyof BenchmarkFilters) => {
      const criteria: BenchmarkFilters = { ...benchmarkFilters, [key]: null };
      return [
        ...new Set(
          maquinariasBase
            .filter((evaluation) => matchBenchmarkFilters(evaluation, criteria))
            .map((evaluation) => evaluation[key])
            .filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0,
            ),
        ),
      ].sort((a, b) => a.localeCompare(b, "es"));
    };

    return {
      marcas: optionsFor("marca"),
      ubicaciones: optionsFor("ubicacion"),
      tiposEvaluacion: optionsFor("tipoEvaluacion"),
    };
  }, [benchmarkFilters, maquinariasBase, matchBenchmarkFilters]);

  const setBenchmarkFilter = (key: keyof BenchmarkFilters, value: string[] | null) => {
    setBenchmarkFilters((prev) => {
      const next: BenchmarkFilters = {
        ...prev,
        [key]: key === "tipoEvaluacion" ? coerceSingleTipoEvaluacion(value, "Ventas") : value,
      };

      const optionsFor = (targetKey: keyof BenchmarkFilters) => {
        const criteria: BenchmarkFilters = { ...next, [targetKey]: null };
        return new Set(
          maquinariasBase
            .filter((evaluation) => matchBenchmarkFilters(evaluation, criteria))
            .map((evaluation) => evaluation[targetKey])
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0),
        );
      };

      for (const targetKey of ["marca", "ubicacion", "tipoEvaluacion"] as const) {
        const current = next[targetKey];
        if (current === null) continue;
        const allowed = optionsFor(targetKey);
        next[targetKey] = current.filter((item) => allowed.has(item));
      }

      setCompetenciaFilters((prevComp) => {
        const nextComp: CompetenciaFilters = {
          ...prevComp,
          marca: next.marca,
          ubicacion: next.ubicacion,
        };
        const scopedCompetencia = competenciaBase.filter((evaluation) =>
          matchContextFilters(evaluation, {
            ubicacion: next.ubicacion,
            tipoEvaluacion: next.tipoEvaluacion,
          }),
        );

        const optionsForCompetencia = (targetKey: keyof CompetenciaFilters) => {
          const criteria: CompetenciaFilters = { ...nextComp, [targetKey]: null };
          return new Set(
            scopedCompetencia
              .filter((evaluation) => matchCompetenciaFilters(evaluation, criteria))
              .map((evaluation) => evaluation[targetKey])
              .filter((item): item is string => typeof item === "string" && item.trim().length > 0),
          );
        };

        for (const targetKey of ["concesionaria"] as const) {
          const current = nextComp[targetKey];
          if (current === null) continue;
          const allowed = optionsForCompetencia(targetKey);
          nextComp[targetKey] = current.filter((item) => allowed.has(item));
        }

        return nextComp;
      });

      return next;
    });
  };

  const competenciaScopedByMaquinarias = useMemo(
    () =>
      competenciaBase.filter((evaluation) =>
        matchContextFilters(evaluation, {
          ubicacion: benchmarkFilters.ubicacion,
          tipoEvaluacion: benchmarkFilters.tipoEvaluacion,
        }),
      ),
    [
      benchmarkFilters.tipoEvaluacion,
      benchmarkFilters.ubicacion,
      competenciaBase,
      matchContextFilters,
    ],
  );

  const competenciaOptions = useMemo(() => {
    const optionsFor = (key: keyof CompetenciaFilters) => {
      const criteria: CompetenciaFilters = { ...competenciaFilters, [key]: null };
      return [
        ...new Set(
          competenciaScopedByMaquinarias
            .filter((evaluation) => matchCompetenciaFilters(evaluation, criteria))
            .map((evaluation) => evaluation[key])
            .filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0,
            ),
        ),
      ].sort((a, b) => a.localeCompare(b, "es"));
    };

    return {
      concesionarias: optionsFor("concesionaria"),
      marcas: optionsFor("marca"),
      ubicaciones: optionsFor("ubicacion"),
    };
  }, [competenciaFilters, competenciaScopedByMaquinarias, matchCompetenciaFilters]);

  const setCompetenciaFilter = (key: keyof CompetenciaFilters, value: string[] | null) => {
    setCompetenciaFilters((prev) => {
      const next: CompetenciaFilters = { ...prev, [key]: value };

      const optionsFor = (targetKey: keyof CompetenciaFilters) => {
        const criteria: CompetenciaFilters = { ...next, [targetKey]: null };
        return new Set(
          competenciaScopedByMaquinarias
            .filter((evaluation) => matchCompetenciaFilters(evaluation, criteria))
            .map((evaluation) => evaluation[targetKey])
            .filter((item): item is string => typeof item === "string" && item.trim().length > 0),
        );
      };

      for (const targetKey of ["concesionaria"] as const) {
        const current = next[targetKey];
        if (current === null) continue;
        const allowed = optionsFor(targetKey);
        next[targetKey] = current.filter((item) => allowed.has(item));
      }

      return next;
    });
  };

  const selectedMaquinarias = useMemo(
    () =>
      maquinariasBase.filter((evaluation) => matchBenchmarkFilters(evaluation, benchmarkFilters)),
    [benchmarkFilters, maquinariasBase, matchBenchmarkFilters],
  );

  const comparableMaquinarias = useMemo(
    () =>
      selectedMaquinarias.filter(
        (evaluation) =>
          (!competenciaFilters.marca?.length || competenciaFilters.marca.includes(evaluation.marca)) &&
          (!competenciaFilters.ubicacion?.length ||
            competenciaFilters.ubicacion.includes(evaluation.ubicacion)),
      ),
    [competenciaFilters.marca, competenciaFilters.ubicacion, selectedMaquinarias],
  );

  const selectedCompetencia = useMemo(
    () =>
      competenciaScopedByMaquinarias.filter((evaluation) =>
        matchCompetenciaFilters(evaluation, competenciaFilters),
      ),
    [competenciaFilters, competenciaScopedByMaquinarias, matchCompetenciaFilters],
  );

  const scopes: Scopes = useMemo(
    () => ({
      selection: [...selectedMaquinarias, ...selectedCompetencia],
      maquinarias: comparableMaquinarias,
      competencia: selectedCompetencia,
      selectionLabel: "Benchmark VS",
      maquinariasLabel:
        comparableMaquinarias.length === 0
          ? "Maquinarias sin dato comparable"
          : benchmarkFilters.marca?.length || benchmarkFilters.ubicacion?.length
            ? "Maquinarias filtrada"
            : "Maquinarias (todas)",
      competenciaLabel:
        competenciaFilters.concesionaria?.length ||
        competenciaFilters.marca?.length ||
        competenciaFilters.ubicacion?.length ||
        benchmarkFilters.ubicacion?.length ||
        (benchmarkFilters.tipoEvaluacion?.[0] ?? "Ventas") !== "Ventas"
          ? "Competencia filtrada"
          : benchmarkFilters.marca?.length ||
              benchmarkFilters.ubicacion?.length ||
              (benchmarkFilters.tipoEvaluacion?.[0] ?? "Ventas") !== "Ventas"
            ? "Competencia en contexto Maquinarias"
            : "Competencia (todas)",
    }),
    [
      benchmarkFilters.marca,
      benchmarkFilters.ubicacion,
      benchmarkFilters.tipoEvaluacion,
      competenciaFilters.concesionaria,
      competenciaFilters.marca,
      competenciaFilters.ubicacion,
      comparableMaquinarias,
      selectedMaquinarias,
      selectedCompetencia,
    ],
  );

  const benchmarkActiveCount = [
    benchmarkFilters.marca,
    benchmarkFilters.ubicacion,
    competenciaFilters.concesionaria,
    competenciaFilters.marca,
    competenciaFilters.ubicacion,
  ].filter((values) => values !== null && values.length > 0).length +
    ((benchmarkFilters.tipoEvaluacion?.[0] ?? "Ventas") !== "Ventas" ? 1 : 0);
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

      <main className="mx-auto max-w-300 space-y-6 px-4 py-6 lg:px-8">
        <div className="flex flex-col gap-8 p-5 md:p-8">
          <section className="rounded-xl border border-border bg-card p-5 md:p-6">
            <SectionHeader
              title="Filtro de comparación VS"
              description="Maquinarias define el contexto del VS. Marca, ubicación y tipo de evaluación se reflejan en Competencia como punto de partida; luego puedes ajustar Competencia por concesionaria, marca y ubicación para comparar escenarios específicos."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBenchmarkFilters(EMPTY_BENCHMARK_FILTERS);
                    setCompetenciaFilters(EMPTY_COMPETENCIA_FILTERS);
                  }}
                  disabled={benchmarkActiveCount === 0}
                  className="shrink-0 gap-2 rounded-full text-muted-foreground hover:text-primary"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Limpiar filtro VS</span>
                </Button>
              }
            />
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)]">
              <div className="rounded-xl border border-border p-3">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                  Maquinarias
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 justify-start rounded-full border-border bg-card px-4 text-sm font-medium shadow-none"
                    disabled
                  >
                    Concesionaria: Maquinarias
                  </Button>
                  <MultiFilterSelect
                    label="Marca"
                    values={benchmarkFilters.marca}
                    options={benchmarkOptions.marcas.map((item) => ({ value: item, label: item }))}
                    onChange={(values) => setBenchmarkFilter("marca", values)}
                  />
                  <MultiFilterSelect
                    label="Ubicación"
                    values={benchmarkFilters.ubicacion}
                    options={benchmarkOptions.ubicaciones.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(values) => setBenchmarkFilter("ubicacion", values)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border p-3">
                <h4 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-foreground">
                  Tipo de evaluación
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <MultiFilterSelect
                    label="Tipo"
                    values={benchmarkFilters.tipoEvaluacion}
                    options={benchmarkOptions.tiposEvaluacion.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    singleSelect
                    showAllOption={false}
                    onChange={(values) => setBenchmarkFilter("tipoEvaluacion", values)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 justify-start rounded-full border-border bg-card px-4 text-sm font-medium text-muted-foreground shadow-none"
                    disabled
                  >
                    Sincronizado en ambas bases
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground">
                  Competencia
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <MultiFilterSelect
                    label="Concesionaria"
                    values={competenciaFilters.concesionaria}
                    options={competenciaOptions.concesionarias.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(values) => setCompetenciaFilter("concesionaria", values)}
                  />
                  <MultiFilterSelect
                    label="Marca"
                    values={competenciaFilters.marca}
                    options={competenciaOptions.marcas.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(values) => setCompetenciaFilter("marca", values)}
                  />
                  <MultiFilterSelect
                    label="Ubicación"
                    values={competenciaFilters.ubicacion}
                    options={competenciaOptions.ubicaciones.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(values) => setCompetenciaFilter("ubicacion", values)}
                  />
                </div>
              </div>
            </div>
          </section>

          {scopes.selection.length === 0 && (
            <section className="rounded-xl border border-dashed border-border bg-card p-5">
              <EmptyState />
            </section>
          )}

          {/* Hero benchmark */}
          <section className="rounded-xl border border-border bg-card p-6 md:p-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 md:gap-10">
              <div className="text-center md:text-right">
                <p className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">
                  Maquinarias
                </p>
                <p className="mt-2 text-5xl font-black text-primary tabular-nums md:text-6xl">
                  {fmtPct(bench.maquinarias)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {bench.nMaquinarias} evaluaciones · {scopes.maquinariasLabel}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                  VS
                </span>
                <GapChip gap={bench.brecha} className="text-base" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  Competencia
                </p>
                <p className="mt-2 text-5xl font-black text-foreground/60 tabular-nums md:text-6xl">
                  {fmtPct(bench.competencia)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {bench.nCompetencia} evaluaciones · {scopes.competenciaLabel}
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Universo actual: {bench.nMaquinarias} Maquinarias vs {bench.nCompetencia} Competencia.
            </p>
            {(bench.nMaquinarias === 0 || bench.nCompetencia === 0) && (
              <p className="mx-auto mt-3 max-w-lg rounded-lg border border-dashed border-border bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
                No hay dato comparable en {bench.nMaquinarias === 0 ? "Maquinarias" : "Competencia"}
                con la selección actual. Mantén la UI y ajusta filtros para continuar comparando.
              </p>
            )}
            <p className="mx-auto mt-6 max-w-lg rounded-lg bg-accent px-4 py-2.5 text-center text-[13px] font-medium text-accent-foreground">
              {benchmarkSentence(bench)}
            </p>
          </section>

          {/* Benchmark por indicador */}
          <section className="rounded-xl border border-border bg-card p-5 md:p-6">
            <SectionHeader
              title="Benchmark por indicador"
              description="Posición de Maquinarias frente a la competencia en cada indicador."
              action={
                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      e.target.value as "abs" | "ventaja-maq" | "ventaja-comp" | "mayor" | "menor",
                    )
                  }
                  className="transition-ui h-8 rounded-md border border-input bg-card px-2 text-[13px] font-medium shadow-xs outline-none focus:border-ring"
                >
                  <option value="abs">Brecha absoluta</option>
                  <option value="ventaja-maq">Mayor ventaja Maquinarias</option>
                  <option value="ventaja-comp">Mayor ventaja competencia</option>
                  <option value="mayor">Mayor resultado</option>
                  <option value="menor">Menor resultado</option>
                </select>
              }
            />
            {rows.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No hay datos para el benchmark por indicador con los filtros actuales.
              </p>
            ) : (
              <DumbbellChart rows={rows} onSelect={openIndicador} />
            )}
          </section>

          {/* Brechas positivas / negativas */}
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <GapList
              title="Dónde Maquinarias supera a la competencia"
              description="Top 5 brechas positivas"
              tone="success"
              rows={positivas}
              onSelect={openIndicador}
            />
            <GapList
              title="Dónde debemos cerrar brechas"
              description="Top 5 indicadores donde la competencia supera a Maquinarias"
              tone="danger"
              rows={negativas}
              onSelect={openIndicador}
            />
          </section>
        </div>
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
  rows: {
    id: string;
    nombre: string;
    brecha: number | null;
    maquinarias: number | null;
    competencia: number | null;
  }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <SectionHeader title={title} description={description} />
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No hay brechas {tone === "success" ? "positivas" : "negativas"} en el universo
          seleccionado.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => onSelect(r.id)}
                className="transition-ui group flex w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-foreground group-hover:text-primary">
                    {r.nombre}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                    Maq. {fmtPct(r.maquinarias)} · Comp. {fmtPct(r.competencia)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      tone === "success" ? "text-success" : "text-danger",
                    )}
                  >
                    {fmtPp(r.brecha)}
                  </span>
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
