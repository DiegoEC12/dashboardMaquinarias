import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreBar } from "@/components/dash/primitives";
import { SectionCard } from "@/components/dash/primitives";
import {
  MARCA_PROPIA,
  avg,
  brechaPorIndicador,
  benchmark,
  labelOf,
  localKey,
  pct,
  title,
  toneColor,
  toneOf,
  type Evaluacion,
} from "@/lib/analytics";

export function BenchmarkPanel({ evs, delay = 0 }: { evs: Evaluacion[]; delay?: number }) {
  const b = benchmark(evs);
  const gaps = brechaPorIndicador(evs);
  const [expanded, setExpanded] = useState(false);
  const visibles = expanded ? gaps : gaps.slice(0, 4);
  const positive = b.brecha >= 0;

  return (
    <SectionCard
      title="Benchmark general"
      subtitle="Maquinarias vs. competencia"
      delay={delay}
      action={
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
            positive ? "bg-good/10 text-good" : "bg-bad/10 text-bad",
          )}
        >
          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {`${positive ? "+" : ""}${(b.brecha * 100).toFixed(1)} pp`}
        </span>
      }
    >
      <div className="space-y-4">
        {[
          { name: "Maquinarias", value: b.maquinarias, n: b.nPropias, own: true },
          { name: "Competencia", value: b.competencia, n: b.nOtras, own: false },
        ].map((row, i) => (
          <div key={row.name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className={cn("text-sm", row.own ? "font-bold" : "font-medium text-muted-foreground")}>
                {row.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">{row.n} visitas</span>
              </span>
              <span
                className={cn(
                  "font-display text-lg font-bold",
                  row.value !== null
                    ? toneOf(row.value) === "alto"
                      ? "text-success"
                      : toneOf(row.value) === "medio"
                        ? "text-warning"
                        : "text-danger"
                    : "text-muted-foreground",
                )}
              >
                {row.n ? pct(row.value) : "—"}
              </span>
            </div>
            <div className="mt-1">
              <ScoreBar value={row.value ?? 0} className="h-3" />
            </div>
          </div>
        ))}

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Brecha por indicador
          </p>
          <ul className="space-y-2.5">
            {visibles.map((g, i) => (
              <li key={g.n} className="rise-in" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm">{g.nombre}</span>
                  <span className="font-display text-sm font-bold" style={{ color: toneColor[toneOf(g.own)] }}>
                    {pct(g.own)}
                  </span>
                  <span
                    className={cn(
                      "w-16 shrink-0 text-right text-xs font-semibold",
                      g.gap >= 0 ? "text-good" : "text-bad",
                    )}
                  >
                    {`${g.gap >= 0 ? "+" : ""}${(g.gap * 100).toFixed(0)} pp`}
                  </span>
                </div>
                <ScoreBar value={g.own} className="mt-1.5 h-1.5" delay={i * 60} />
              </li>
            ))}
          </ul>
          {gaps.length > 4 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
            >
              {expanded ? "Ver menos" : `Ver los ${gaps.length} indicadores`}
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
            </button>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

export function RankingPanel({
  evs,
  scoreOf,
  selected,
  onSelect,
  delay = 0,
}: {
  evs: Evaluacion[];
  scoreOf: (e: Evaluacion) => number;
  selected: string | null;
  onSelect: (id: string) => void;
  delay?: number;
}) {
  const grouped = new Map<
    string,
    {
      representative: Evaluacion;
      bestScore: number;
      representativeId: string;
      scores: number[];
      count: number;
    }
  >();

  for (const evaluation of evs) {
    const score = scoreOf(evaluation);
    const key = localKey(evaluation.concesionaria, evaluation.marca, evaluation.ubicacion);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        representative: evaluation,
        bestScore: score,
        representativeId: evaluation.id,
        scores: [score],
        count: 1,
      });
      continue;
    }
    current.scores.push(score);
    current.count += 1;
    if (score > current.bestScore) {
      current.bestScore = score;
      current.representative = evaluation;
      current.representativeId = evaluation.id;
    }
  }

  const rows = [...grouped.values()]
    .map((group) => ({
      ev: group.representative,
      score: avg(group.scores),
      representativeId: group.representativeId,
      count: group.count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <SectionCard title="Ranking de locales" subtitle="Clic para ver el detalle del local" delay={delay}>
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={r.representativeId}>
            <button
              type="button"
              onClick={() => onSelect(r.representativeId)}
              className={cn(
                "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                selected === r.representativeId ? "bg-accent" : "hover:bg-muted",
              )}
            >
              <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{labelOf(r.ev)}</span>
                  {r.ev.concesionaria === MARCA_PROPIA && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Propio
                    </span>
                  )}
                </span>
                <span className="mt-1 block">
                  <ScoreBar value={r.score} delay={i * 60} className="h-1.5" />
                </span>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                  {title(r.ev.ubicacion)}
                  {r.count > 1 ? ` · ${r.count} evaluaciones` : ""}
                </span>
              </span>
              <span
                className="font-display text-sm font-bold"
                style={{ color: toneColor[toneOf(r.score)] }}
              >
                {pct(r.score)}
              </span>
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Sin resultados</li>}
      </ul>
    </SectionCard>
  );
}
