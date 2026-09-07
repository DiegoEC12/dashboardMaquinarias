import raw from "@/data/dataset.json";
import type { Dataset, Evaluation, Indicator, Question } from "./types";
import { normalizeTipoEvaluacion } from "@/lib/tipo-evaluacion";

type LegacyRawDataset = {
  meta?: Record<string, unknown>;
  evaluaciones?: LegacyEvaluationRow[];
  evaluations?: LegacyEvaluationRow[];
  indicadores?: LegacyIndicatorRow[];
  indicators?: LegacyIndicatorRow[];
  indicatorResults?: Dataset["indicatorResults"];
  questionResponses?: Dataset["questionResponses"];
  questions?: Question[];
};

type LegacyEvaluationRow = {
  id?: unknown;
  periodo?: unknown;
  concesionaria?: unknown;
  marca?: unknown;
  ubicacion?: unknown;
  tipoEvaluacion?: unknown;
};

type LegacyIndicatorRow = {
  ev?: unknown;
  idEvaluacion?: unknown;
  n?: unknown;
  orden?: unknown;
  id?: unknown;
  idIndicador?: unknown;
  nombre?: unknown;
  nombreIndicador?: unknown;
  peso?: unknown;
  cumpl?: unknown;
  resultado?: unknown;
};

/** Normaliza distintos formatos de dataset a la interfaz `Dataset` usada por la app. */
function normalize(rawData: LegacyRawDataset | Dataset): Dataset {
  // Caso ya normalizado (mismo shape esperado)
  if (rawData && rawData.indicators && rawData.evaluations && rawData.indicatorResults) {
    return rawData as Dataset;
  }

  const legacyData = rawData as LegacyRawDataset;
  const meta = legacyData.meta ?? {};
  const rawEvaluations = legacyData.evaluaciones ?? legacyData.evaluations ?? [];

  // Normalizar evaluaciones (from `evaluaciones` Spanish key)
  const evaluations: Evaluation[] = rawEvaluations.map((e) => ({
    id: String(e.id ?? ""),
    periodo:
      typeof e.periodo === "string"
        ? e.periodo
        : typeof meta["periodo"] === "string"
          ? meta["periodo"]
          : "",
    concesionaria: String(e.concesionaria ?? ""),
    marca: String(e.marca ?? ""),
    ubicacion: String(e.ubicacion ?? ""),
    tipoEvaluacion: normalizeTipoEvaluacion(e.tipoEvaluacion),
    // Derivar tipoEmpresa: si la concesionaria literal es 'MAQUINARIAS', se considera Maquinarias
    tipoEmpresa:
      e.concesionaria && String(e.concesionaria).toUpperCase() === "MAQUINARIAS"
        ? "MAQUINARIAS"
        : "COMPETENCIA",
  }));

  // Construir mapa de evaluaciones para conocer su tipoEvaluacion
  const evalTypeMap = new Map<string, string>();
  for (const e of evaluations) {
    if (e.id) evalTypeMap.set(e.id, e.tipoEvaluacion);
  }

  // Construir indicadores únicos y resultados desde `indicadores` (spanish)
  const rawInds = (legacyData.indicadores ?? legacyData.indicators ?? []) as LegacyIndicatorRow[];
  const indicatorsMap = new Map<string, Indicator>();
  const indicatorResults: {
    idEvaluacion: string;
    idIndicador: string;
    resultado: number | null;
    peso: number;
  }[] = [];

  for (const ri of rawInds) {
    // Algunos registros vienen por-evaluación: tienen `ev` (evaluation id) y `n` (número)
    const evId =
      typeof ri.ev === "string"
        ? ri.ev
        : typeof ri.idEvaluacion === "string"
          ? ri.idEvaluacion
          : null;
    const nRaw = ri.n ?? ri.orden ?? null;
    const n = typeof nRaw === "number" ? nRaw : Number(nRaw ?? NaN);
    const evType = evId ? evalTypeMap.get(evId) : undefined;
    const isCall = evType?.toLowerCase().includes("call");
    const prefix = isCall ? "IND_CAL" : "IND";

    const idIndicador =
      typeof ri.id === "string"
        ? ri.id
        : typeof ri.idIndicador === "string"
          ? ri.idIndicador
          : n
            ? `${prefix}_${String(n).padStart(2, "0")}`
            : `IND_${Math.random().toString(36).slice(2, 7)}`;
    const resultado =
      typeof ri.cumpl === "number"
        ? ri.cumpl
        : typeof ri.resultado === "number"
          ? ri.resultado
          : null;
    const peso = typeof ri.peso === "number" ? ri.peso : 0;

    // Asegurar que el indicador esté en el mapa
    if (!indicatorsMap.has(idIndicador)) {
      const nombre =
        typeof ri.nombre === "string"
          ? ri.nombre
          : typeof ri.nombreIndicador === "string"
            ? ri.nombreIndicador
            : `Indicador ${n ?? idIndicador}`;
      indicatorsMap.set(idIndicador, {
        id: idIndicador,
        nombre,
        peso,
        orden: typeof n === "number" ? n : 0,
      });
    }

    if (evId) {
      indicatorResults.push({
        idEvaluacion: evId,
        idIndicador,
        resultado,
        peso,
      });
    }
  }

  const indicators = Array.from(indicatorsMap.values()).sort((a, b) => a.orden - b.orden);

  return {
    meta,
    indicators,
    questions: [],
    evaluations,
    indicatorResults,
    questionResponses: [],
  };
}

export const dataset = normalize(raw as LegacyRawDataset);
const initialDataset = JSON.parse(JSON.stringify(dataset)) as Dataset;

export function replaceDataset(next: Dataset) {
  dataset.meta = next.meta;
  dataset.indicators.splice(0, dataset.indicators.length, ...next.indicators);
  dataset.questions.splice(0, dataset.questions.length, ...next.questions);
  dataset.evaluations.splice(0, dataset.evaluations.length, ...next.evaluations);
  dataset.indicatorResults.splice(0, dataset.indicatorResults.length, ...next.indicatorResults);
  dataset.questionResponses.splice(0, dataset.questionResponses.length, ...next.questionResponses);
}

export function resetDataset() {
  replaceDataset(initialDataset);
}

export const MAQUINARIAS = "Maquinarias";

export function getIndicator(id: string) {
  return dataset.indicators.find((indicator) => indicator.id === id);
}
export function getQuestion(id: string) {
  return dataset.questions.find((question) => question.id === id);
}
export function getEvaluation(id: string) {
  return dataset.evaluations.find((evaluation) => evaluation.id === id);
}

export function isMaquinarias(concesionaria: string) {
  return concesionaria.toUpperCase() === "MAQUINARIAS";
}

/** Valores únicos para los selectores de filtros. */
export function distinct<K extends keyof Evaluation>(key: K): string[] {
  const set = new Set<string>();
  for (const e of dataset.evaluations) {
    const v = e[key];
    if (typeof v === "string" && v) set.add(v);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}
