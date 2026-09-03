import * as XLSX from "xlsx";
import { dataset, replaceDataset, resetDataset } from "./mystery/dataset";
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

const initialAnalytics = {
  evaluations: structuredClone(evaluaciones),
  indicators: structuredClone(indicadores),
  questions: structuredClone(preguntas),
};

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

  const evaluations: Evaluacion[] = evaluationRows.map((row, index) => ({
    id: text(findValue(row, ["id", "idevaluacion", "evaluacionid"]), `EV_EXCEL_${index + 1}`),
    concesionaria: text(findValue(row, ["concesionaria", "dealer", "empresa"])),
    marca: text(findValue(row, ["marca", "brand"])),
    ubicacion: text(findValue(row, ["ubicacion", "local", "sede", "location"])),
    puntaje: number(findValue(row, ["puntaje", "puntajetotal", "score", "resultado"])),
    resumen: text(findValue(row, ["resumen", "resumenvisita", "summary"]), "") || null,
    recomendaciones: text(findValue(row, ["recomendaciones", "recommendations"]), "") || null,
    tipoEvaluacion: text(findValue(row, ["tipoevaluacion", "tipo", "evaluationtype"]), "Venta"),
  }));

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

  const catalog = Array.from(new Map(indicators.map((row) => [row.n, row])).values());
  const normalizedIndicators: Indicator[] = catalog.map((row) => ({
    id: indicatorId(row.n),
    nombre: row.nombre,
    peso: row.peso,
    orden: row.n,
  }));
  const normalizedEvaluations: Evaluation[] = evaluations.map((evaluation) => ({
    id: evaluation.id,
    periodo: "",
    concesionaria: evaluation.concesionaria,
    marca: evaluation.marca,
    ubicacion: evaluation.ubicacion,
    tipoEvaluacion: evaluation.tipoEvaluacion,
    tipoEmpresa:
      evaluation.concesionaria.toUpperCase() === "MAQUINARIAS" ? "MAQUINARIAS" : "COMPETENCIA",
  }));
  const normalizedResults: IndicatorResult[] = indicators.map((row) => ({
    idEvaluacion: row.ev,
    idIndicador: indicatorId(row.n),
    resultado: row.cumpl,
    peso: row.peso,
  }));
  const normalizedQuestions: QuestionResponse[] = questions.map((row, index) => ({
    idEvaluacion: row.ev,
    idPregunta: `Q_${index + 1}`,
    puntaje: row.nota,
    comentario: row.obs,
    respuesta: row.resp,
  }));

  const imported: Dataset = {
    meta: { source: file.name, importedAt: new Date().toISOString() },
    indicators: normalizedIndicators,
    questions: [],
    evaluations: normalizedEvaluations,
    indicatorResults: normalizedResults,
    questionResponses: normalizedQuestions,
  };
  replaceDataset(imported);
  evaluaciones.splice(0, evaluaciones.length, ...evaluations);
  indicadores.splice(0, indicadores.length, ...indicators);
  preguntas.splice(0, preguntas.length, ...questions);
  return { dataset, analytics: { evaluations, indicators, questions } };
}

export function resetImportedData() {
  resetDataset();
  evaluaciones.splice(0, evaluaciones.length, ...structuredClone(initialAnalytics.evaluations));
  indicadores.splice(0, indicadores.length, ...structuredClone(initialAnalytics.indicators));
  preguntas.splice(0, preguntas.length, ...structuredClone(initialAnalytics.questions));
}
