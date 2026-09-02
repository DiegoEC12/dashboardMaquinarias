import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/mystery/page-header";
import { SectionHeader, EmptyState } from "@/components/mystery/primitives";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { getScopes } from "@/lib/mystery/calculations";
import { preguntasAgregadas } from "@/lib/analytics";
import { useFilters } from "@/lib/mystery/filter-context";
import CompactFilterControls from "@/components/dash/CompactFilterControls";

export const Route = createFileRoute("/indicadores")({
  head: () => ({ meta: [{ title: "Indicadores — Preguntas críticas | Maquinarias" }] }),
  component: IndicadoresPage,
});

function IndicadoresPage() {
  const { filters, setFilter } = useFilters();
  const [ambito, setAmbito] = useState<"red" | "local">("red");
  const [selectedIndicator, setSelectedIndicator] = useState<number | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<string | null>(null);

  const scopes = useMemo(() => getScopes(filters), [filters]);
  const evs = scopes.selection;

  const lista = useMemo(() => preguntasAgregadas(evs as any), [evs]);

  const locales = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; evIds: string[] }>();
    for (const e of evs) {
      const id = `${e.concesionaria}|${e.marca}|${e.ubicacion}`;
      const nombre = `${e.concesionaria} · ${e.marca}${e.ubicacion ? ` · ${e.ubicacion}` : ""}`;
      const cur = map.get(id) ?? { id, nombre, evIds: [] };
      cur.evIds.push(e.id);
      map.set(id, cur);
    }
    return Array.from(map.values());
  }, [evs]);

  const getBarClass = (pct: number) => (pct >= 85 ? "bg-alto" : pct >= 70 ? "bg-medio" : "bg-bajo");
  const getTextClass = (pct: number) => (pct >= 85 ? "text-success" : pct >= 70 ? "text-warning" : "text-danger");

  // detalle para el sidebar
  const sidebarDetail = useMemo(() => {
    if (!selectedIndicator || !selectedLocal) return null;
    const local = locales.find((l) => l.id === selectedLocal);
    if (!local) return null;
    const entries = lista.filter((entry) => entry.ind === selectedIndicator);
    // calcular promedio del indicador en este local usando todas las preguntas del indicador
    const perQuestion = entries.map((entry) => {
      const rows = entry.respuestas.filter((r) => local.evIds.includes(r.ev));
      const avg = rows.length ? (rows.reduce((s, r) => s + (r.nota ?? 0), 0) / rows.length) * 100 : 0;
      return { q: entry.q, indicador: entry.indicador, avg, n: rows.length, samples: rows.slice(0, 6) };
    });
    const overall = perQuestion.length ? perQuestion.reduce((s, r) => s + r.avg, 0) / perQuestion.length : 0;
    const weakest = perQuestion.sort((a, b) => a.avg - b.avg).slice(0, 3);
    return { local, overall, weakest, perQuestion };
  }, [selectedIndicator, selectedLocal, lista, locales]);

  if (evs.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Indicadores" description="Preguntas críticas por indicador" />
        <div className="p-5 md:p-8">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Indicadores" description="Explora los 12 indicadores y su desempeño por local." />
      <CompactFilterControls />

      <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="card-suave animar-entrada px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">Preguntas de menor cumplimiento</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ambito === "red" ? "Promedio de toda la red de locales." : "Resultados del local seleccionado."}
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-border bg-card p-1">
                {([
                  { id: "red", label: "Toda la red" },
                  { id: "local", label: "Local seleccionado" },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAmbito(t.id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      ambito === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Accordion type="single" collapsible className="mt-5">
                {lista
                  .map((p) => ({ ...p, valor: ambito === "red" ? p.valor : (p.respuestas?.length ? (p.respuestas.reduce((s, r) => s + (r.nota ?? 0), 0) / p.respuestas.length) : 0) }))
                  .sort((a, b) => a.valor - b.valor)
                  .map((p, i) => (
                    <AccordionItem key={`${p.q}-${i}`} value={String(i)} className="border-border">
                      <AccordionTrigger
                        className="gap-4 py-4 hover:no-underline"
                        onClick={() => {
                          setSelectedIndicator(p.ind);
                          setSelectedLocal(null);
                        }}
                      >
                        <span className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold">{i + 1}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{p.q}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{p.indicador}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block">
                              <span className={cn("block h-full rounded-full", getBarClass(p.valor * 100))} style={{ width: `${(p.valor * 100).toFixed(0)}%` }} />
                            </span>
                            <span className="w-11 text-right text-sm font-semibold tabular-nums">{(p.valor * 100).toFixed(0)}%</span>
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="mt-0.5 h-3.5 w-3.5 text-primary" aria-hidden />
                          Cumplimiento por local · haz clic para seleccionar
                        </div>
                        <ul className="mt-3 grid gap-2 md:grid-cols-2">
                          {locales
                            .map((l) => {
                              const rows = p.respuestas?.filter((r: any) => l.evIds.includes(r.ev)) ?? [];
                              const v = rows.length ? (rows.reduce((s: number, r: any) => s + (r.nota ?? 0), 0) / rows.length) * 100 : 0;
                              return { l, v };
                            })
                            .sort((a, b) => a.v - b.v)
                            .map(({ l, v }) => (
                              <li key={l.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLocal(l.id);
                                    const [con, mar, ubi] = l.id.split("|");
                                    setFilter("concesionaria", con || null);
                                    setFilter("marca", mar || null);
                                    setFilter("ubicacion", ubi || null);
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                    selectedLocal === l.id ? "bg-accent" : "border-border hover:bg-muted/60",
                                  )}
                                >
                                  <span className="min-w-0 flex-1 truncate">{l.nombre}</span>
                                  <span className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                                    <span className={cn("block h-full rounded-full", getBarClass(v))} style={{ width: `${v}%` }} />
                                  </span>
                                  <span className={cn("w-10 shrink-0 text-right font-semibold tabular-nums", getTextClass(v))}>{Math.round(v)}%</span>
                                </button>
                              </li>
                            ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <div className="text-xs text-muted-foreground">Promedio de la red: {(p.valor * 100).toFixed(0)}%</div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </div>
          </section>

          <aside className="rounded-xl border border-border bg-card p-5">
            <SectionHeader title="Detalle" description={selectedLocal ? "Detalle por local" : "Selecciona un indicador o local"} />
            {!selectedIndicator ? (
              <p className="text-sm text-muted-foreground">Selecciona un indicador para ver el detalle aquí.</p>
            ) : !selectedLocal ? (
              <div className="text-sm text-muted-foreground">Selecciona un local en la lista para ver la nota por local.</div>
            ) : sidebarDetail ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">{sidebarDetail.local.nombre}</h3>
                  <div className="mt-1 text-xs text-muted-foreground">Evaluaciones: {sidebarDetail.perQuestion.reduce((s, r) => s + r.n, 0)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Puntaje indicador</div>
                  <div className={cn("text-2xl font-black tabular-nums", getTextClass(sidebarDetail.overall))}>{Math.round(sidebarDetail.overall)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Indicadores más débiles</div>
                  <ul className="mt-2 space-y-2">
                    {sidebarDetail.weakest.map((w, i) => (
                      <li key={`${w.q}-${i}`} className="flex items-center justify-between">
                        <div className="min-w-0 pr-3">
                          <div className="text-sm truncate">{w.q}</div>
                          <div className="text-xs text-muted-foreground">{w.indicador}</div>
                        </div>
                        <div className="text-sm font-semibold tabular-nums">{Math.round(w.avg)}%</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay datos para el local seleccionado.</p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default IndicadoresPage;
