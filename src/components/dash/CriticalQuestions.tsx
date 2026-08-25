import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBar, SectionCard } from "@/components/dash/primitives";
import { pct, toneColor, toneOf, type PreguntaAgg } from "@/lib/analytics";

export function CriticalQuestions({
  items,
  delay = 0,
}: {
  items: PreguntaAgg[];
  delay?: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? items.slice(0, 24) : items.slice(0, 6);

  return (
    <SectionCard
      title="Preguntas críticas"
      subtitle="Menor cumplimiento — despliega para ver respuestas por local"
      delay={delay}
    >
      <ul className="divide-y divide-border">
        {list.map((item, i) => {
          const key = `${item.ind}|${item.q}`;
          const isOpen = open === key;
          return (
            <li key={key} className="rise-in py-2" style={{ animationDelay: `${i * 40}ms` }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : key)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-left"
                aria-expanded={isOpen}
              >
                <span className="min-w-0">
                  <span className="line-clamp-2 text-sm font-medium">{item.q}</span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {item.indicador}
                  </span>
                </span>
                <span
                  className="font-display text-sm font-bold"
                  style={{ color: toneColor[toneOf(item.valor)] }}
                >
                  {pct(item.valor)}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-300",
                    isOpen && "rotate-180 text-primary",
                  )}
                />
              </button>
              <ScoreBar value={item.valor} className="mt-2 h-1.5" delay={i * 50} />
              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <ul className="space-y-2 rounded-lg bg-muted/60 p-3">
                    {item.respuestas.map((r) => (
                      <li key={r.ev} className="text-xs">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{r.local}</span>
                          <span style={{ color: toneColor[toneOf(r.nota ?? 0)] }} className="font-bold">
                            {r.resp ?? "—"}
                          </span>
                        </span>
                        {r.obs && <p className="mt-0.5 text-muted-foreground">{r.obs}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">Sin resultados</li>
        )}
      </ul>
      {items.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {showAll ? "Ver solo las 6 más críticas" : "Ver más preguntas"}
        </button>
      )}
    </SectionCard>
  );
}
