const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const workbook = XLSX.readFile(path.resolve("base-mystery-3.xlsx"), { cellDates: true });
const rows = (sheet) => XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: null });
const evaluations = rows("Evaluaciones");
const indicatorRows = rows("Indicadores");
const questionRows = rows("Preguntas");

const output = {
  meta: {
    source: "base-mystery-3.xlsx",
    importedAt: new Date().toISOString(),
    evaluationCount: evaluations.length,
  },
  evaluaciones: evaluations.map((row) => ({
    id: String(row.id_evaluacion),
    concesionaria: row.concesionaria ?? "",
    marca: row.marca ?? "",
    ubicacion: row.ubicacion ?? "",
    puntaje: Number(row.puntaje_total) || 0,
    resumen: row.resumen_visita ?? null,
    recomendaciones: row.recomendaciones ?? null,
    tipoEvaluacion: "Venta",
  })),
  indicadores: indicatorRows.map((row) => ({
    ev: String(row.id_evaluacion),
    n: Number(row.no_indicador),
    nombre: row.indicador ?? "",
    peso: Number(row.peso) || 0,
    cumpl: Number(row.cumplimiento) || 0,
  })),
  preguntas: questionRows.map((row) => ({
    ev: String(row.id_evaluacion),
    ind: Number(row.no_indicador),
    indicador: row.indicador ?? "",
    q: row.pregunta ?? "",
    resp: row.respuesta ?? null,
    nota: row.nota === null ? null : Number(row.nota),
    obs: row.observacion ?? null,
  })),
};

fs.mkdirSync(path.resolve("src/data"), { recursive: true });
fs.writeFileSync(
  path.resolve("src/data/mystery-shopping-imported.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
console.log(
  `Generated ${output.evaluaciones.length} evaluations, ${output.indicadores.length} indicators rows and ${output.preguntas.length} questions.`,
);
