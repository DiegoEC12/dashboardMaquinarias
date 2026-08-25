import { useState } from "react";
import { SectionCard } from "@/components/dash/primitives";
import { cn } from "@/lib/utils";
import {
  indicadorCatalogo,
  indicadores as allIndicadores,
  labelOf,
  pct,
  toneColor,
  toneOf,
  title,
  type Evaluacion,
} from "@/lib/analytics";

type Cell = { ev: Evaluacion; n: number; nombre: string; valor: number };

export function Heatmap({
  evs,
  onSelect,
  selected,
  delay = 0,
}: {
  evs: Evaluacion[];
  onSelect: (id: string) => void;
  selected: string | null;
  delay?: number;
}) {
  const [hover, setHover] = useState<Cell | null>(null);

  return (
    <SectionCard
      title="Mapa de calor: local vs. indicador"
      subtitle="Pasa el cursor sobre una celda para ver el detalle"
      delay={delay}
      action={
        <div className="hidden shrink-0 items-center gap-3 text-[11px] text-muted-foreground sm:flex">
          {(["critico", "medio", "alto"] as const).map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: toneColor[t] }} />
              {t === "critico" ? "<50%" : t === "medio" ? "50-70%" : ">70%"}
            </span>
          ))}
        </div>
      }
    >
      <div className="relative">
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[640px]">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${indicadorCatalogo.length}, minmax(0, 1fr))` }}
            >
              <div />
              {indicadorCatalogo.map((c) => (
                <div
                  key={c.n}
                  className="pb-1 text-center text-[10px] font-semibold text-muted-foreground"
                  title={c.nombre}
                >
                  {c.n}
                </div>
              ))}

              {evs.map((ev, r) => (
                <FragmentRow
                  key={ev.id}
                  ev={ev}
                  rowIndex={r}
                  selected={selected === ev.id}
                  onSelect={onSelect}
                  onHover={setHover}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "pointer-events-none mt-3 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs transition-all duration-200",
            hover ? "opacity-100" : "opacity-60",
          )}
        >
          {hover ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold">{labelOf(hover.ev)}</span>
              <span className="text-muted-foreground">{title(hover.ev.ubicacion)}</span>
              <span className="text-muted-foreground">·</span>
              <span>{hover.nombre}</span>
              <span className="font-display font-bold" style={{ color: toneColor[toneOf(hover.valor)] }}>
                {pct(hover.valor)}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Los indicadores 1 a 12 siguen el orden del formulario de evaluación.
            </span>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

function FragmentRow({
  ev,
  rowIndex,
  selected,
  onSelect,
  onHover,
}: {
  ev: Evaluacion;
  rowIndex: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (cell: Cell | null) => void;
}) {
  const rows = allIndicadores.filter((i) => i.ev === ev.id);
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(ev.id)}
        className={cn(
          "truncate rounded px-1 text-left text-xs font-medium transition-colors hover:text-primary",
          selected && "text-primary",
        )}
      >
        {labelOf(ev)}
      </button>
      {indicadorCatalogo.map((c, i) => {
        const row = rows.find((r) => r.n === c.n);
        const valor = row?.cumpl ?? 0;
        return (
          <button
            key={c.n}
            type="button"
            onClick={() => onSelect(ev.id)}
            onMouseEnter={() => onHover({ ev, n: c.n, nombre: c.nombre, valor })}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover({ ev, n: c.n, nombre: c.nombre, valor })}
            className="rise-in h-7 rounded-[4px] transition-transform duration-200 hover:z-10 hover:scale-[1.18] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{
              backgroundColor: toneColor[toneOf(valor)],
              opacity: 0.35 + Math.min(0.65, valor + 0.15),
              animationDelay: `${(rowIndex * 12 + i) * 12}ms`,
            }}
            aria-label={`${labelOf(ev)} — ${c.nombre}: ${pct(valor)}`}
          />
        );
      })}
    </>
  );
}
