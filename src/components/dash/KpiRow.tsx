import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBar, ToneDot } from "@/components/dash/primitives";
import {
  labelOf,
  pct,
  toneColor,
  toneLabel,
  toneOf,
  type Evaluacion,
} from "@/lib/analytics";

type Kpi = {
  key: string;
  label: string;
  value: string;
  caption: string;
  tone?: number | undefined;
  detail: React.ReactNode;
};

function KpiCard({ kpi, open, onToggle, index }: { kpi: Kpi; open: boolean; onToggle: () => void; index: number }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "panel panel-interactive rise-in group flex flex-col p-4 text-left",
        open && "ring-2 ring-ring/25",
      )}
      style={{ animationDelay: `${index * 70}ms` }}
      aria-expanded={open}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {kpi.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180 text-primary",
          )}
        />
      </div>
      <div
        className="mt-2 font-display text-3xl font-extrabold tracking-tight"
        style={kpi.tone !== undefined ? { color: toneColor[toneOf(kpi.tone)] } : undefined}
      >
        {kpi.value}
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{kpi.caption}</p>
      {kpi.tone !== undefined && <ScoreBar value={kpi.tone} className="mt-3" delay={index * 90} />}
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border pt-3 text-xs text-muted-foreground">{kpi.detail}</div>
        </div>
      </div>
    </button>
  );
}

export function KpiRow({
  evs,
  scoreOf,
  indicadores,
}: {
  evs: Evaluacion[];
  scoreOf: (e: Evaluacion) => number;
  indicadores: { n: number; nombre: string; valor: number }[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const scored = evs
    .map((e) => ({ ev: e, score: scoreOf(e) }))
    .sort((a, b) => b.score - a.score);
  const global = scored.length ? scored.reduce((a, b) => a + b.score, 0) / scored.length : 0;
  const best = scored[0];
  const worst = scored[scored.length - 1];
  const criticos = indicadores.filter((i) => i.valor < 0.5);
  const dist = {
    alto: scored.filter((s) => s.score >= 0.7).length,
    medio: scored.filter((s) => s.score >= 0.5 && s.score < 0.7).length,
    critico: scored.filter((s) => s.score < 0.5).length,
  };

  const kpis: Kpi[] = [
    {
      key: "global",
      label: "Puntaje global",
      value: pct(global),
      caption: "Cumplimiento general",
      tone: global,
      detail: (
        <ul className="space-y-1.5">
          {(["alto", "medio", "critico"] as const).map((t) => (
            <li key={t} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: toneColor[t] }}
                />
                {toneLabel[t]}
              </span>
              <span className="font-semibold text-foreground">{dist[t]}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "evals",
      label: "Evaluaciones",
      value: String(evs.length),
      caption: "Visitas en el filtro actual",
      detail: (
        <ul className="space-y-1">
          {scored.slice(0, 6).map((s) => (
            <li key={s.ev.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{labelOf(s.ev)}</span>
              <span className="font-semibold text-foreground">{pct(s.score)}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "best",
      label: "Mejor evaluación",
      value: best ? pct(best.score) : "—",
      caption: best ? labelOf(best.ev) : "Sin datos",
      tone: best?.score,
      detail: best ? (
        <p className="line-clamp-4 leading-relaxed">{best.ev.resumen ?? "Sin resumen disponible."}</p>
      ) : null,
    },
    {
      key: "worst",
      label: "Menor evaluación",
      value: worst ? pct(worst.score) : "—",
      caption: worst ? labelOf(worst.ev) : "Sin datos",
      tone: worst?.score,
      detail: worst ? (
        <p className="line-clamp-4 leading-relaxed">{worst.ev.resumen ?? "Sin resumen disponible."}</p>
      ) : null,
    },
    {
      key: "criticos",
      label: "Indicadores críticos",
      value: `${criticos.length}`,
      caption: "Indicadores bajo 50%",
      detail: (
        <ul className="space-y-1.5">
          {criticos.length === 0 && <li>Ningún indicador bajo el umbral crítico.</li>}
          {criticos.map((c) => (
            <li key={c.n} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <ToneDot value={c.valor} />
                <span className="truncate">{c.nombre}</span>
              </span>
              <span className="font-semibold text-foreground">{pct(c.valor)}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map((kpi, i) => (
        <KpiCard
          key={kpi.key}
          kpi={kpi}
          index={i}
          open={open === kpi.key}
          onToggle={() => setOpen(open === kpi.key ? null : kpi.key)}
        />
      ))}
    </div>
  );
}
