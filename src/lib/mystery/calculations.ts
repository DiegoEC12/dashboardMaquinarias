import { dataset, isMaquinarias } from "./dataset";
import type { Evaluation, IndicatorResult } from "./types";

export const THRESHOLDS = {
  ALTO: 0.85,
  MEDIO: 0.7,
} as const;

export type Status = "alto" | "medio" | "critico" | "sin-evaluar";

export const STATUS_LABEL: Record<Status, string> = {
  alto: "Alto",
  medio: "Medio",
  critico: "Crítico",
  "sin-evaluar": "Sin evaluar",
};

export const INDICATOR_STATE_LABEL: Record<Status, string> = {
  alto: "Favorable",
  medio: "Atención",
  critico: "Crítico",
  "sin-evaluar": "Sin evaluar",
};

export function statusFor(v: number | null | undefined): Status {
  if (v === null || v === undefined || !Number.isFinite(v)) return "sin-evaluar";
  if (v >= THRESHOLDS.ALTO) return "alto";
  if (v >= THRESHOLDS.MEDIO) return "medio";
  return "critico";
}

export interface GlobalFilters {
  periodo: string[] | null;
  concesionaria: string[] | null;
  marca: string[] | null;
  ubicacion: string[] | null;
  tipoEvaluacion: string[] | null;
  indicador: string[] | null;
}

export const EMPTY_FILTERS: GlobalFilters = {
  periodo: null,
  concesionaria: null,
  marca: null,
  ubicacion: null,
  tipoEvaluacion: null,
  indicador: null,
};

export function filterEvaluations(evals: Evaluation[], f: GlobalFilters): Evaluation[] {
  const selectedIndicators = f.indicador;
  return evals.filter(
    (e) =>
      (!f.periodo || f.periodo.includes(e.periodo)) &&
      (!f.concesionaria || f.concesionaria.includes(e.concesionaria)) &&
      (!f.marca || f.marca.includes(e.marca)) &&
      (!f.ubicacion || f.ubicacion.includes(e.ubicacion)) &&
      (!f.tipoEvaluacion || f.tipoEvaluacion.includes(e.tipoEvaluacion)) &&
      (!selectedIndicators ||
        dataset.indicatorResults.some(
          (result) =>
            result.idEvaluacion === e.id &&
            selectedIndicators.some(
              (indicator) =>
                indicator === result.idIndicador ||
                `IND_${String(Number(indicator)).padStart(2, "0")}` === result.idIndicador,
            ),
        )),
  );
}

export interface Scopes {
  selection: Evaluation[];
  maquinarias: Evaluation[];
  competencia: Evaluation[];
  selectionLabel: string;
  maquinariasLabel: string;
  competenciaLabel: string;
}

export function getScopes(f: GlobalFilters): Scopes {
  const base = filterEvaluations(dataset.evaluations, {
    ...EMPTY_FILTERS,
    periodo: f.periodo,
    concesionaria: null,
    marca: f.marca,
    ubicacion: f.ubicacion,
    tipoEvaluacion: f.tipoEvaluacion,
    indicador: f.indicador,
  });
  const maqAll = base.filter((e) => e.tipoEmpresa === "MAQUINARIAS");
  const compAll = base.filter((e) => e.tipoEmpresa === "COMPETENCIA");

  let maq = maqAll;
  let comp = compAll;
  let maqLabel = "Maquinarias (todas)";
  let compLabel = "Competencia (todas)";
  const selectedConcesionarias = f.concesionaria;
  const selectedConcesionaria = selectedConcesionarias?.[0];
  if (
    selectedConcesionarias?.length === 1 &&
    selectedConcesionaria &&
    isMaquinarias(selectedConcesionaria)
  ) {
    maq = maqAll.filter((e) => selectedConcesionarias.includes(e.concesionaria));
    maqLabel = selectedConcesionaria;
  } else if (selectedConcesionarias?.length === 1) {
    comp = compAll.filter((e) => selectedConcesionarias.includes(e.concesionaria));
    compLabel = selectedConcesionaria ?? "";
  }

  const selection = selectedConcesionarias?.length
    ? base.filter((e) => selectedConcesionarias.includes(e.concesionaria))
    : base;

  return {
    selection,
    maquinarias: maq,
    competencia: comp,
    selectionLabel: f.concesionaria?.length ? f.concesionaria.join(", ") : "Todas las evaluaciones",
    maquinariasLabel: maqLabel,
    competenciaLabel: compLabel,
  };
}

function ids(evals: Evaluation[]): string[] {
  return evals.map((e) => e.id);
}

export function calculateWeightedScore(evalIds: string[]): number | null {
  return weightedFromRows(dataset.indicatorResults.filter((r) => evalIds.includes(r.idEvaluacion)));
}

function weightedFromRows(rows: IndicatorResult[]): number | null {
  let sum = 0;
  let w = 0;
  for (const r of rows) {
    if (r.resultado === null || r.resultado === undefined) continue;
    sum += r.resultado * r.peso;
    w += r.peso;
  }
  return w > 0 ? sum / w : null;
}

export function indicatorScore(evalIds: string[], indicatorId: string): number | null {
  return weightedFromRows(
    dataset.indicatorResults.filter(
      (r) => r.idIndicador === indicatorId && evalIds.includes(r.idEvaluacion),
    ),
  );
}

export function calculateGap(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return a - b;
}

export interface BenchmarkResult {
  maquinarias: number | null;
  competencia: number | null;
  brecha: number | null;
  nMaquinarias: number;
  nCompetencia: number;
}

export function calculateBenchmark(scopes: Scopes): BenchmarkResult {
  const m = calculateWeightedScore(ids(scopes.maquinarias));
  const c = calculateWeightedScore(ids(scopes.competencia));
  return {
    maquinarias: m,
    competencia: c,
    brecha: calculateGap(m, c),
    nMaquinarias: scopes.maquinarias.length,
    nCompetencia: scopes.competencia.length,
  };
}

export interface IndicatorPerformance {
  id: string;
  nombre: string;
  peso: number;
  orden: number;
  resultado: number | null;
  maquinarias: number | null;
  competencia: number | null;
  brecha: number | null;
  impacto: number | null; // (1 - resultado) × peso
  estado: Status;
  nEvaluaciones: number;
}

export function calculateIndicatorPerformance(scopes: Scopes): IndicatorPerformance[] {
  const selIds = ids(scopes.selection);
  const maqIds = ids(scopes.maquinarias);
  const compIds = ids(scopes.competencia);
  return dataset.indicators.map((ind) => {
    const resultado = indicatorScore(selIds, ind.id);
    const maq = indicatorScore(maqIds, ind.id);
    const comp = indicatorScore(compIds, ind.id);
    const n = dataset.indicatorResults.filter(
      (r) => r.idIndicador === ind.id && selIds.includes(r.idEvaluacion),
    ).length;
    return {
      id: ind.id,
      nombre: ind.nombre,
      peso: ind.peso,
      orden: ind.orden,
      resultado,
      maquinarias: maq,
      competencia: comp,
      brecha: calculateGap(maq, comp),
      impacto: calculatePriorityImpact(resultado, ind.peso),
      estado: statusFor(resultado),
      nEvaluaciones: n,
    };
  });
}

export function calculatePriorityImpact(resultado: number | null, peso: number): number | null {
  if (resultado === null) return null;
  return (1 - resultado) * peso;
}

export type PriorityLevel = "ALTA" | "MEDIA" | "BAJA";

export function priorityLevel(impacto: number | null, brecha: number | null): PriorityLevel {
  const imp = impacto ?? 0;
  const gapPenalty = brecha !== null && brecha < 0 ? Math.abs(brecha) * 0.5 : 0;
  const score = imp + gapPenalty;
  if (score >= 0.045) return "ALTA";
  if (score >= 0.02) return "MEDIA";
  return "BAJA";
}

export interface QuestionPerformance {
  id: string;
  pregunta: string;
  tipoRespuesta: string;
  cumplimiento: number | null;
  nEvaluaciones: number;
  pesoIndicador: number;
  impacto: number | null;
}

export function getCriticalQuestions(
  indicatorId: string,
  evalIds: string[],
): QuestionPerformance[] {
  const indicator = dataset.indicators.find((i) => i.id === indicatorId);
  const pesoIndicador = indicator?.peso ?? 0;
  return dataset.questions
    .filter((q) => q.idIndicador === indicatorId)
    .map((q) => {
      const rows = dataset.questionResponses.filter(
        (r) => r.idPregunta === q.id && evalIds.includes(r.idEvaluacion) && r.puntaje !== null,
      );
      const cumplimiento = rows.length
        ? rows.reduce((s, r) => s + (r.puntaje ?? 0), 0) / rows.length
        : null;
      return {
        id: q.id,
        pregunta: q.pregunta,
        tipoRespuesta: q.tipoRespuesta,
        cumplimiento,
        nEvaluaciones: rows.length,
        pesoIndicador,
        impacto: cumplimiento === null ? null : (1 - cumplimiento) * pesoIndicador,
      };
    });
}

export function getFailingEvaluations(
  questionId: string,
  evalIds: string[],
): {
  evaluation: Evaluation;
  puntaje: number;
  comentario: string | null;
  respuesta: string | null;
}[] {
  return dataset.questionResponses
    .filter(
      (r) =>
        r.idPregunta === questionId &&
        evalIds.includes(r.idEvaluacion) &&
        r.puntaje !== null &&
        r.puntaje < 1,
    )
    .map((r) => ({
      evaluation: dataset.evaluations.find((e) => e.id === r.idEvaluacion)!,
      puntaje: r.puntaje ?? 0,
      comentario: r.comentario,
      respuesta: r.respuesta,
    }))
    .sort((a, b) => a.puntaje - b.puntaje);
}

export interface GroupScore {
  key: string;
  label: string;
  marca?: string;
  ubicacion?: string;
  tipoEmpresa?: Evaluation["tipoEmpresa"];
  score: number | null;
  n: number;
  brecha: number | null;
}

export function groupScores(
  evals: Evaluation[],
  groupBy: (e: Evaluation) => { key: string; label: string; extra?: Partial<GroupScore> },
  reference: number | null,
): GroupScore[] {
  type Acc = { label: string; extra: Partial<GroupScore> | undefined; ids: string[] };
  const groups = new Map<string, Acc>();
  for (const e of evals) {
    const g = groupBy(e);
    const cur: Acc = groups.get(g.key) ?? { label: g.label, extra: g.extra, ids: [] };
    cur.ids.push(e.id);
    groups.set(g.key, cur);
  }
  return [...groups.entries()].map(([key, g]) => {
    const score = calculateWeightedScore(g.ids);
    return {
      key,
      label: g.label,
      ...g.extra,
      score,
      n: g.ids.length,
      brecha: calculateGap(score, reference),
    };
  });
}

export function benchmarkSentence(b: BenchmarkResult): string {
  if (b.brecha === null) return "No hay datos suficientes para comparar contra la referencia.";
  const pp = Math.abs(b.brecha * 100).toFixed(1);
  if (b.brecha > 0) return `Maquinarias se encuentra ${pp} pp sobre la competencia.`;
  if (b.brecha < 0) return `Maquinarias se encuentra ${pp} pp por debajo de la competencia.`;
  return "Maquinarias está empatada con la competencia.";
}
