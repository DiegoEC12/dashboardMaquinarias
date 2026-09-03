import raw from "@/data/dataset.json";
import type { Dataset, Evaluation, Indicator, Question } from "./types";

/** Normaliza distintos formatos de dataset a la interfaz `Dataset` usada por la app. */
function normalize(rawData: any): Dataset {
  // Caso ya normalizado (mismo shape esperado)
  if (rawData && rawData.indicators && rawData.evaluations && rawData.indicatorResults) {
    return rawData as Dataset;
  }

  const meta = rawData.meta ?? {};

  // Normalizar evaluaciones (from `evaluaciones` Spanish key)
  const evaluations: Evaluation[] = (rawData.evaluaciones || rawData.evaluations || []).map(
    (e: any) => ({
      id: e.id,
      periodo: e.periodo ?? meta.periodo ?? null,
      concesionaria: e.concesionaria ?? "",
      marca: e.marca ?? "",
      ubicacion: e.ubicacion ?? "",
      tipoEvaluacion: e.tipoEvaluacion ?? "Venta",
      // Derivar tipoEmpresa: si la concesionaria literal es 'MAQUINARIAS', se considera Maquinarias
      tipoEmpresa:
        e.concesionaria && String(e.concesionaria).toUpperCase() === "MAQUINARIAS"
          ? "MAQUINARIAS"
          : "COMPETENCIA",
    }),
  );

  // Construir indicadores únicos y resultados desde `indicadores` (spanish)
  const rawInds: any[] = rawData.indicadores || rawData.indicators || [];
  const indicatorsMap = new Map<string, Indicator>();
  const indicatorResults: {
    idEvaluacion: string;
    idIndicador: string;
    resultado: number | null;
    peso: number;
  }[] = [];

  for (const ri of rawInds) {
    // Algunos registros vienen por-evaluación: tienen `ev` (evaluation id) y `n` (número)
    const evId = ri.ev ?? ri.idEvaluacion ?? null;
    const n = ri.n ?? ri.orden ?? null;
    const idIndicador = n
      ? `IND_${String(n).padStart(2, "0")}`
      : ri.id || ri.idIndicador || `IND_${Math.random().toString(36).slice(2, 7)}`;

    // Asegurar que el indicador esté en el mapa
    if (!indicatorsMap.has(idIndicador)) {
      indicatorsMap.set(idIndicador, {
        id: idIndicador,
        nombre: ri.nombre ?? ri.nombreIndicador ?? `Indicador ${n ?? idIndicador}`,
        peso: typeof ri.peso === "number" ? ri.peso : 0,
        orden: typeof n === "number" ? n : 0,
      });
    }

    if (evId) {
      indicatorResults.push({
        idEvaluacion: evId,
        idIndicador,
        resultado: ri.cumpl ?? ri.resultado ?? null,
        peso: typeof ri.peso === "number" ? ri.peso : 0,
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

export const dataset = normalize(raw as unknown as any);

export const MAQUINARIAS = "Maquinarias";

const indicatorById = new Map<string, Indicator>(dataset.indicators.map((i) => [i.id, i]));
const questionById = new Map<string, Question>(dataset.questions.map((q) => [q.id, q]));
const evaluationById = new Map<string, Evaluation>(dataset.evaluations.map((e) => [e.id, e]));

export function getIndicator(id: string) {
  return indicatorById.get(id);
}
export function getQuestion(id: string) {
  return questionById.get(id);
}
export function getEvaluation(id: string) {
  return evaluationById.get(id);
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
