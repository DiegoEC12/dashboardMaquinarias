import * as XLSX from "xlsx";
import { dataset, replaceDataset } from "./mystery/dataset";
import type {
  Dataset,
  Evaluation,
  Indicator,
  IndicatorResult,
  QuestionResponse,
} from "./mystery/types";
import {
  evaluaciones,
  indicadores,
  preguntas,
  type Evaluacion,
  type IndicadorRow,
  type PreguntaRow,
} from "./analytics";
import { normalizeTipoEvaluacion } from "@/lib/tipo-evaluacion";
import bundledRaw from "@/data/mystery-shopping-imported.json";

const IMPORT_STORAGE_KEYS = [
  "dashboard-maquinarias.imported-payload.v2",
  "dashboard-maquinarias.imported-payload.v1",
] as const;

let startupHydrationDone = false;

interface ImportedPayload {
  dataset: Dataset;
  analytics: { evaluations: Evaluacion[]; indicators: IndicadorRow[]; questions: PreguntaRow[] };
}

type ImportedEvaluation = Evaluacion & { __tipoEmpresaRaw?: string };

function emptyDataset(source = "excel-import-empty"): Dataset {
  return {
    meta: {
      source,
      importedAt: new Date().toISOString(),
      evaluationCount: 0,
    },
    indicators: [],
    questions: [],
    evaluations: [],
    indicatorResults: [],
    questionResponses: [],
  };
}

function emptyAnalytics(): ImportedPayload["analytics"] {
  return {
    evaluations: [],
    indicators: [],
    questions: [],
  };
}

function syncAnalyticsData(analytics: ImportedPayload["analytics"]) {
  evaluaciones.splice(0, evaluaciones.length, ...analytics.evaluations);
  indicadores.splice(0, indicadores.length, ...analytics.indicators);
  preguntas.splice(0, preguntas.length, ...analytics.questions);
}

function persistImportedPayload(payload: ImportedPayload) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IMPORT_STORAGE_KEYS[0], JSON.stringify(payload));
}

export function loadPersistedImportedPayload(): ImportedPayload | null {
  if (typeof window === "undefined") return null;
  for (const storageKey of IMPORT_STORAGE_KEYS) {
    const rawPayload = window.localStorage.getItem(storageKey);
    if (!rawPayload) continue;
    try {
      const parsed = JSON.parse(rawPayload) as ImportedPayload;
      if (!parsed.analytics) return parsed;
      const source =
        typeof parsed.dataset?.meta?.["source"] === "string"
          ? parsed.dataset.meta["source"]
          : undefined;
      const normalized: ImportedPayload = {
        dataset: buildDatasetFromAnalytics(parsed.analytics, source),
        analytics: parsed.analytics,
      };
      if (storageKey !== IMPORT_STORAGE_KEYS[0]) {
        window.localStorage.setItem(IMPORT_STORAGE_KEYS[0], JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }
  return null;
}

function clearPersistedImportedPayload() {
  if (typeof window === "undefined") return;
  for (const storageKey of IMPORT_STORAGE_KEYS) {
    window.localStorage.removeItem(storageKey);
  }
}

function loadBundledPayload(): ImportedPayload {
  const analytics = {
    evaluations: bundledRaw.evaluaciones as Evaluacion[],
    indicators: bundledRaw.indicadores as IndicadorRow[],
    questions: bundledRaw.preguntas as PreguntaRow[],
  };
  return {
    dataset: buildDatasetFromAnalytics(analytics, bundledRaw.meta.source as string),
    analytics,
  };
}

export function applyImportedPayload(payload: ImportedPayload) {
  replaceDataset(payload.dataset);
  syncAnalyticsData(payload.analytics);
}

export function hydrateImportedDataFromStorage(): boolean {
  if (startupHydrationDone) {
    return dataset.evaluations.length > 0;
  }
  startupHydrationDone = true;

  const persistedPayload = loadPersistedImportedPayload();
  if (persistedPayload) {
    applyImportedPayload(persistedPayload);
    return true;
  }

  applyImportedPayload(loadBundledPayload());
  return true;
}

const SHEET_ALIASES = {
  evaluations: ["evaluaciones", "evaluations", "evaluation", "visitas"],
  indicators: ["indicadores", "indicators", "indicatorresults", "resultados"],
  questions: ["preguntas", "questions", "respuestas", "questionresponses"],
};

function key(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findValue(row: Record<string, unknown>, names: string[]) {
  const entry = Object.entries(row).find(([name]) => names.includes(key(name)));
  return entry?.[1] ?? null;
}

function text(value: unknown, fallback = "") {
  return value === null || value === undefined ? fallback : String(value).trim();
}

function number(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sheetRows(workbook: XLSX.WorkBook, aliases: string[]) {
  const sheetName = workbook.SheetNames.find((name) => aliases.includes(key(name)));
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  return sheet ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }) : [];
}

function indicatorId(value: unknown) {
  const raw = text(value);
  if (raw.startsWith("IND_")) return raw;
  const order = Number(raw);
  return Number.isFinite(order) ? `IND_${String(order).padStart(2, "0")}` : raw;
}

function buildDatasetFromRows(
  evaluations: ImportedEvaluation[],
  indicatorRows: IndicadorRow[],
  questionRows: PreguntaRow[],
  source = "excel-import",
): Dataset {
  const catalog = Array.from(new Map(indicatorRows.map((row) => [row.n, row])).values());
  const normalizedIndicators: Indicator[] = catalog.map((row) => ({
    id: indicatorId(row.n),
    nombre: row.nombre,
    peso: row.peso,
    orden: row.n,
  }));
  const normalizedEvaluations: Evaluation[] = evaluations.map((evaluation) => {
    const enterpriseHint = `${evaluation.__tipoEmpresaRaw ?? ""} ${evaluation.concesionaria}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

    const isOwn =
      enterpriseHint.includes("MAQUINARIAS") ||
      enterpriseHint.includes("PROPIA") ||
      enterpriseHint.includes("INTERNAL");

    return {
      id: evaluation.id,
      periodo: "",
      concesionaria: evaluation.concesionaria,
      marca: evaluation.marca,
      ubicacion: evaluation.ubicacion,
      tipoEvaluacion: normalizeTipoEvaluacion(evaluation.tipoEvaluacion),
      tipoEmpresa: isOwn ? "MAQUINARIAS" : "COMPETENCIA",
    };
  });
  const normalizedResults: IndicatorResult[] = indicatorRows.map((row) => ({
    idEvaluacion: row.ev,
    idIndicador: indicatorId(row.n),
    resultado: row.cumpl,
    peso: row.peso,
  }));
  const normalizedQuestions: QuestionResponse[] = questionRows.map((row, index) => ({
    idEvaluacion: row.ev,
    idPregunta: `Q_${index + 1}`,
    puntaje: row.nota,
    comentario: row.obs,
    respuesta: row.resp,
  }));

  return {
    meta: {
      source,
      importedAt: new Date().toISOString(),
      evaluationCount: normalizedEvaluations.length,
    },
    indicators: normalizedIndicators,
    questions: [],
    evaluations: normalizedEvaluations,
    indicatorResults: normalizedResults,
    questionResponses: normalizedQuestions,
  };
}

function buildDatasetFromAnalytics(
  analytics: ImportedPayload["analytics"],
  source = "excel-import",
): Dataset {
  return buildDatasetFromRows(
    analytics.evaluations,
    analytics.indicators,
    analytics.questions,
    source,
  );
}

export async function importExcelFile(file: File): Promise<{
  dataset: Dataset;
  analytics: { evaluations: Evaluacion[]; indicators: IndicadorRow[]; questions: PreguntaRow[] };
}> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const evaluationRows = sheetRows(workbook, SHEET_ALIASES.evaluations);
  const indicatorRows = sheetRows(workbook, SHEET_ALIASES.indicators);
  const questionRows = sheetRows(workbook, SHEET_ALIASES.questions);

  if (!evaluationRows.length || !indicatorRows.length || !questionRows.length) {
    throw new Error("El Excel debe incluir las hojas Evaluaciones, Indicadores y Preguntas.");
  }

  const evaluations = evaluationRows.map((row, index) => {
    const concesionaria = text(findValue(row, ["concesionaria", "dealer", "cliente"]));
    const empresaRaw = text(
      findValue(row, ["tipoempresa", "empresa", "grupoempresa", "categoriaempresa", "companytype"]),
      "",
    );

    const record: Evaluacion & { __tipoEmpresaRaw: string } = {
      id: text(findValue(row, ["id", "idevaluacion", "evaluacionid"]), `EV_EXCEL_${index + 1}`),
      concesionaria: concesionaria || text(findValue(row, ["empresa", "dealer"])),
      marca: text(findValue(row, ["marca", "brand"])),
      ubicacion: text(findValue(row, ["ubicacion", "local", "sede", "location"])),
      puntaje: number(findValue(row, ["puntaje", "puntajetotal", "score", "resultado"])),
      resumen: text(findValue(row, ["resumen", "resumenvisita", "summary"]), "") || null,
      recomendaciones: text(findValue(row, ["recomendaciones", "recommendations"]), "") || null,
      tipoEvaluacion: text(
        findValue(row, ["tipoevaluacion", "origencanal", "canalorigen", "tipo", "evaluationtype"]),
        "Venta",
      ),
      __tipoEmpresaRaw: empresaRaw,
    };

    record.tipoEvaluacion = normalizeTipoEvaluacion(record.tipoEvaluacion);

    return record;
  });

  const indicators: IndicadorRow[] = indicatorRows
    .map((row) => ({
      ev: text(findValue(row, ["ev", "idevaluacion", "evaluacionid"])),
      n: number(findValue(row, ["n", "orden", "numero", "indicadorn", "noindicador"])),
      nombre: text(findValue(row, ["nombre", "nombreindicador", "indicador", "name"])),
      peso: number(findValue(row, ["peso", "weight"])),
      cumpl: number(findValue(row, ["cumpl", "cumplimiento", "resultado", "score", "nota"])),
    }))
    .filter((row) => row.ev && row.n > 0);

  const questions: PreguntaRow[] = questionRows
    .map((row) => ({
      ev: text(findValue(row, ["ev", "idevaluacion", "evaluacionid"])),
      ind: number(findValue(row, ["ind", "n", "indicadorn", "noindicador"])),
      indicador: text(findValue(row, ["indicador", "nombreindicador", "indicator"])),
      q: text(findValue(row, ["q", "pregunta", "question"])),
      resp: text(findValue(row, ["resp", "respuesta", "answer"]), "") || null,
      nota:
        findValue(row, ["nota", "puntaje", "score"]) === null
          ? null
          : number(findValue(row, ["nota", "puntaje", "score"])),
      obs: text(findValue(row, ["obs", "observacion", "comentario", "comment"]), "") || null,
    }))
    .filter((row) => row.ev && row.ind > 0 && row.q);

  const byEvaluation = new Map(indicators.map((row) => [row.ev, [] as number[]]));
  for (const row of indicators) byEvaluation.get(row.ev)?.push(row.cumpl);
  for (const evaluation of evaluations) {
    if (!evaluation.puntaje) {
      const values = byEvaluation.get(evaluation.id) ?? [];
      evaluation.puntaje = values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;
    }
  }

  const payload: ImportedPayload = {
    dataset: buildDatasetFromRows(evaluations, indicators, questions, file.name),
    analytics: { evaluations, indicators, questions },
  };

  applyImportedPayload(payload);
  persistImportedPayload(payload);
  return { dataset, analytics: { evaluations, indicators, questions } };
}

export function resetImportedData() {
  applyImportedPayload(loadBundledPayload());
  clearPersistedImportedPayload();
}
