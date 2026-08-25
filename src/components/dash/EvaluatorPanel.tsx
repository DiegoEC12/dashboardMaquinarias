import { useState } from "react";
import { ChevronDown, MessageSquareQuote, Lightbulb, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBar } from "@/components/dash/primitives";
import {
  indicadores as allIndicadores,
  indicadorAverages,
  labelOf,
  pct,
  title,
  toneColor,
  toneOf,
  type Evaluacion,
} from "@/lib/analytics";

export function EvaluatorPanel({
  evs,
  selected,
  delay = 0,
}: {
  evs: Evaluacion[];
  selected: Evaluacion | null;
  delay?: number;
}) {
  const [tab, setTab] = useState<"resumen" | "recomendaciones" | "indicadores">("resumen");
  const ev = selected;

  const rows = ev
    ? allIndicadores
        .filter((i) => i.ev === ev.id)
        .sort((a, b) => a.cumpl - b.cumpl)
        .map((i) => ({ n: i.n, nombre: i.nombre, valor: i.cumpl }))
    : indicadorAverages(evs).sort((a, b) => a.valor - b.valor);

  return (
    <aside
      className="panel rise-in sticky top-[168px] flex flex-col overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="graphite-gradient px-5 py-4 text-background">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
          Comentarios del evaluador
        </p>
        <h2 className="mt-1 truncate font-display text-lg font-bold">
          {ev ? labelOf(ev) : "Vista consolidada"}
        </h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs opacity-80">
          <MapPin className="h-3.5 w-3.5" />
          {ev ? title(ev.ubicacion) : `${evs.length} evaluaciones en el filtro`}
        </p>
        {ev && (
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs opacity-80">Puntaje total</span>
              <span className="font-display text-2xl font-extrabold">{pct(ev.puntaje)}</span>
            </div>
            <ScoreBar value={ev.puntaje} className="mt-1.5 bg-background/20" />
          </div>
        )}
      </div>

      <div className="flex border-b border-border text-xs font-semibold">
        {(
          [
            ["resumen", "Resumen"],
            ["recomendaciones", "Recomendaciones"],
            ["indicadores", "Indicadores"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 px-2 py-2.5 transition-colors",
              tab === key
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-h-[420px] overflow-y-auto p-5 text-sm leading-relaxed">
        {tab === "resumen" && (
          <div key="resumen" className="rise-in">
            {ev ? (
              <p className="flex gap-2 text-muted-foreground">
                <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{ev.resumen ?? "Sin resumen registrado."}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Selecciona un local en el ranking o el mapa de calor para leer el resumen de la visita,
                sus recomendaciones y el detalle por indicador.
              </p>
            )}
          </div>
        )}
        {tab === "recomendaciones" && (
          <div key="reco" className="rise-in">
            {ev ? (
              <p className="flex gap-2 whitespace-pre-line text-muted-foreground">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{ev.recomendaciones ?? "Sin recomendaciones registradas."}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">Selecciona un local para ver sus recomendaciones.</p>
            )}
          </div>
        )}
        {tab === "indicadores" && (
          <ul key="ind" className="rise-in space-y-3">
            {rows.map((r, i) => (
              <li key={r.n}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs">{r.nombre}</span>
                  <span
                    className="shrink-0 font-display text-xs font-bold"
                    style={{ color: toneColor[toneOf(r.valor)] }}
                  >
                    {pct(r.valor)}
                  </span>
                </div>
                <ScoreBar value={r.valor} className="mt-1 h-1.5" delay={i * 40} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export function StrengthsOpportunities({
  rows,
  delay = 0,
}: {
  rows: { n: number; nombre: string; valor: number }[];
  delay?: number;
}) {
  const [open, setOpen] = useState(true);
  const fortalezas = rows.filter((r) => r.valor >= 0.6).sort((a, b) => b.valor - a.valor);
  const oportunidades = rows.filter((r) => r.valor < 0.6).sort((a, b) => a.valor - b.valor);

  return (
    <section
      className="panel rise-in overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-5 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-bold tracking-tight">
            Fortalezas vs. oportunidades
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fortalezas.length} fortalezas · {oportunidades.length} oportunidades
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
            {[
              { label: "Fortalezas", items: fortalezas, color: "var(--good)" },
              { label: "Oportunidades", items: oportunidades, color: "var(--bad)" },
            ].map((col) => (
              <div key={col.label}>
                <p
                  className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: col.color }}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                  {col.label}
                </p>
                <ul className="space-y-2">
                  {col.items.map((item, i) => (
                    <li key={item.n} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm">{item.nombre}</span>
                      <span className="w-24 shrink-0">
                        <ScoreBar value={item.valor} className="h-1.5" delay={i * 50} />
                      </span>
                      <span
                        className="w-12 shrink-0 text-right font-display text-xs font-bold"
                        style={{ color: toneColor[toneOf(item.valor)] }}
                      >
                        {pct(item.valor)}
                      </span>
                    </li>
                  ))}
                  {col.items.length === 0 && (
                    <li className="text-xs text-muted-foreground">Sin indicadores en este grupo.</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
