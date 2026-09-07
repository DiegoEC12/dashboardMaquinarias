import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/mystery/page-header";
import { SectionHeader, EmptyState } from "@/components/mystery/primitives";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { availableIndicators, getScopes, indicatorScore } from "@/lib/mystery/calculations";
import { localKey, preguntas } from "@/lib/analytics";
import { useFilters } from "@/lib/mystery/filter-context";
import CompactFilterControls from "@/components/dash/CompactFilterControls";

export const Route = createFileRoute("/indicadores")({
  head: () => ({ meta: [{ title: "Indicadores | Maquinarias" }] }),
  component: IndicadoresPage,
});

function IndicadoresPage() {
  const { filters, dataVersion } = useFilters();
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"mayor" | "menor" | "brecha-pos" | "brecha-neg">(
    "mayor",
  );

  void dataVersion;
  const scopes = getScopes(filters);
  const evs = scopes.selection;

  const locales = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; evIds: string[] }>();
    for (const evaluation of evs) {
      const id = localKey(evaluation.concesionaria, evaluation.marca, evaluation.ubicacion);
      const nombre = `${evaluation.concesionaria} · ${evaluation.marca}${evaluation.ubicacion ? ` · ${evaluation.ubicacion}` : ""}`;
      const current = map.get(id) ?? { id, nombre, evIds: [] };
      if (!current.evIds.includes(evaluation.id)) current.evIds.push(evaluation.id);
      map.set(id, current);
    }
    return Array.from(map.values());
  }, [evs]);

  const indicatorList = useMemo(() => {
    const evaluationIds = evs.map((evaluation) => evaluation.id);
    return availableIndicators(evaluationIds).map((indicator) => ({
      ...indicator,
      n: indicator.orden,
      valor: indicatorScore(evaluationIds, indicator.id) ?? 0,
    }));
  }, [evs]);

  const localScores = useMemo(() => {
    const scores = new Map<string, number | null>();
    for (const local of locales) {
      scores.set(
        local.id,
        selectedIndicator === null
          ? null
          : indicatorScore(local.evIds, selectedIndicator),
      );
    }
    return scores;
  }, [locales, selectedIndicator]);

  const getBarClass = (percentage: number) =>
    percentage > 70 ? "bg-alto" : percentage >= 50 ? "bg-medio" : "bg-bajo";
  const getTextClass = (percentage: number) =>
    percentage > 70 ? "text-success" : percentage >= 50 ? "text-warning" : "text-danger";

  const sidebarDetail = useMemo(() => {
    if (selectedIndicator === null || !selectedLocal) return null;
    const local = locales.find((item) => item.id === selectedLocal);
    if (!local) return null;

    const indObj = indicatorList.find((i) => i.id === selectedIndicator);
    const indOrder = indObj?.orden;

    const questionRows = preguntas
      .filter(
        (question) =>
          (question.ind === indOrder || question.indicador === indObj?.nombre) &&
          local.evIds.includes(question.ev) &&
          question.nota !== null,
      )
      .map((question) => ({ ...question, score: (question.nota ?? 0) * 100 }));

    const allQuestions = [...questionRows].sort((a, b) => b.score - a.score);
    return {
      local,
      overall: (localScores.get(local.id) ?? 0) * 100,
      questions: allQuestions,
    };
  }, [selectedIndicator, selectedLocal, locales, localScores, indicatorList]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Indicadores"
        description={`Explora los ${indicatorList.length} indicadores y su desempeño por local.`}
      />
      <CompactFilterControls />

      <main className="mx-auto max-w-300 space-y-6 px-4 py-6 lg:px-8">
        {evs.length === 0 && (
          <section className="rounded-xl border border-dashed border-border bg-card p-5">
            <EmptyState />
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="card-suave animar-entrada px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">Desempeño por indicador</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selecciona un indicador para revisar sus locales y notas.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                  className="transition-ui h-8 rounded-md border border-input bg-card px-2 text-[13px] font-medium shadow-xs outline-none focus:border-ring"
                >
                  <option value="mayor">Mayor puntaje</option>
                  <option value="menor">Menor puntaje</option>
                  <option value="brecha-pos">Mayor brecha positiva</option>
                  <option value="brecha-neg">Mayor brecha negativa</option>
                </select>
              </div>
            </div>

            {indicatorList.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">
                No hay indicadores para mostrar con los filtros actuales.
              </p>
            ) : (
              <Accordion type="single" collapsible className="mt-5">
                {indicatorList.map((indicator) => (
                  <AccordionItem
                    key={indicator.id}
                    value={indicator.id}
                    className="border-border"
                  >
                    <AccordionTrigger
                      className="gap-4 py-4 hover:no-underline"
                      onClick={() => {
                        setSelectedIndicator(indicator.id);
                        setSelectedLocal(null);
                      }}
                    >
                      <span className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">
                          {indicator.n}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {indicator.nombre}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Peso: {(indicator.peso * 100).toFixed(0)}%
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block">
                            <span
                              className={cn(
                                "block h-full rounded-full",
                                getBarClass(indicator.valor * 100),
                              )}
                              style={{ width: `${(indicator.valor * 100).toFixed(0)}%` }}
                            />
                          </span>
                          <span className="w-11 text-right text-sm font-semibold tabular-nums">
                            {(indicator.valor * 100).toFixed(0)}%
                          </span>
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        Nota del indicador por local · haz clic para ver el resumen
                      </div>
                      <ul className="mt-3 grid gap-2 md:grid-cols-2">
                        {(() => {
                          const networkAvg = indicator.valor * 100;
                          const items = locales.map((local) => ({
                            id: local.id,
                            nombre: local.nombre,
                            percentage: (localScores.get(local.id) ?? 0) * 100,
                            brecha: ((localScores.get(local.id) ?? 0) * 100) - networkAvg,
                          }));

                          items.sort((a, b) => {
                            switch (sortMode) {
                              case "mayor":
                                return b.percentage - a.percentage;
                              case "menor":
                                return a.percentage - b.percentage;
                              case "brecha-pos":
                                return b.brecha - a.brecha;
                              case "brecha-neg":
                                return a.brecha - b.brecha;
                            }
                          });

                          const visible = items.slice(0, 10);

                          return visible.map((local) => (
                            <li key={local.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIndicator(indicator.id);
                                  setSelectedLocal(local.id);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                  selectedLocal === local.id && selectedIndicator === indicator.id
                                    ? "bg-accent"
                                    : "border-border hover:bg-muted/60",
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">{local.nombre}</span>
                                <span className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                                  <span
                                    className={cn(
                                      "block h-full rounded-full",
                                      getBarClass(local.percentage),
                                    )}
                                    style={{ width: `${local.percentage}%` }}
                                  />
                                </span>
                                <span
                                  className={cn(
                                    "w-10 shrink-0 text-right font-semibold tabular-nums",
                                    getTextClass(local.percentage),
                                  )}
                                >
                                  {Math.round(local.percentage)}%
                                </span>
                              </button>
                            </li>
                          ));
                        })()}
                      </ul>
                      <div className="mt-4 text-xs text-muted-foreground">
                        Promedio de la red: {(indicator.valor * 100).toFixed(0)}%
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </section>

          <aside className="rounded-xl border border-border bg-card p-5">
            <SectionHeader
              title="Detalle"
              description={
                selectedLocal ? "Resumen indicador · local" : "Selecciona un indicador o local"
              }
            />
            {selectedIndicator === null ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un indicador para ver el detalle aquí.
              </p>
            ) : !selectedLocal ? (
              <div className="text-sm text-muted-foreground">
                Selecciona un local en la lista para ver su resumen.
              </div>
            ) : sidebarDetail ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">{sidebarDetail.local.nombre}</h3>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Indicador:{" "}
                    {indicatorList.find((indicator) => indicator.id === selectedIndicator)?.nombre}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Puntaje del indicador</div>
                  <div
                    className={cn(
                      "text-2xl font-black tabular-nums",
                      getTextClass(sidebarDetail.overall),
                    )}
                  >
                    {Math.round(sidebarDetail.overall)}%
                  </div>
                </div>
                <QuestionSummary
                  title="Preguntas (mejor → peor)"
                  questions={sidebarDetail.questions.map((q) => ({ q: q.q, score: q.score }))}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay datos para el local seleccionado.
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

type SummaryQuestion = { q: string; score: number };

function QuestionSummary({ title, questions }: { title: string; questions: SummaryQuestion[] }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{title}</div>
      {questions.length ? (
        <ul className="mt-2 space-y-2">
          {questions.map((question, index) => (
            <li key={`${question.q}-${index}`} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm">{question.q}</div>
                <div className="text-xs text-muted-foreground">Resultado de la pregunta</div>
              </div>
              <div className="shrink-0 text-sm font-semibold tabular-nums">
                {Math.round(question.score)}%
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No hay preguntas disponibles.</p>
      )}
    </div>
  );
}
