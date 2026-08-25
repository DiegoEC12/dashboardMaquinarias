import raw from "@/data/dataset.json";

export type Evaluacion = {
  id: string;
  concesionaria: string;
  marca: string;
  ubicacion: string;
  puntaje: number;
  resumen: string | null;
  recomendaciones: string | null;
};

export type IndicadorRow = {
  ev: string;
  n: number;
  nombre: string;
  peso: number;
  cumpl: number;
};

export type PreguntaRow = {
  ev: string;
  ind: number;
  indicador: string;
  q: string;
  resp: string | null;
  nota: number | null;
  obs: string | null;
};

const data = raw as unknown as {
  evaluaciones: Evaluacion[];
  indicadores: IndicadorRow[];
  preguntas: PreguntaRow[];
};

export const evaluaciones = data.evaluaciones;
export const indicadores = data.indicadores;
export const preguntas = data.preguntas;

export const MARCA_PROPIA = "MAQUINARIAS";

export const uniq = (values: string[]) => Array.from(new Set(values)).sort();

export const concesionarias = uniq(evaluaciones.map((e) => e.concesionaria));
export const marcas = uniq(evaluaciones.map((e) => e.marca));
export const ubicaciones = uniq(evaluaciones.map((e) => e.ubicacion));

export const indicadorCatalogo = Array.from(
  new Map(indicadores.map((i) => [i.n, { n: i.n, nombre: i.nombre, peso: i.peso }])).values(),
).sort((a, b) => a.n - b.n);

export const labelOf = (e: Evaluacion) => `${title(e.concesionaria)} ${title(e.marca)}`;

export function title(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export type Filters = {
  concesionaria: string;
  marca: string;
  ubicacion: string;
  indicador: string;
};

export const EMPTY_FILTERS: Filters = {
  concesionaria: "all",
  marca: "all",
  ubicacion: "all",
  indicador: "all",
};

export function filterEvaluaciones(f: Filters) {
  return evaluaciones.filter(
    (e) =>
      (f.concesionaria === "all" || e.concesionaria === f.concesionaria) &&
      (f.marca === "all" || e.marca === f.marca) &&
      (f.ubicacion === "all" || e.ubicacion === f.ubicacion),
  );
}

/** Score of one evaluation, respecting an optional indicator focus. */
export function scoreOf(ev: Evaluacion, indicadorFiltro: string) {
  if (indicadorFiltro === "all") return ev.puntaje;
  const row = indicadores.find((i) => i.ev === ev.id && String(i.n) === indicadorFiltro);
  return row ? row.cumpl : 0;
}

export const avg = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

export const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

export type Tone = "alto" | "medio" | "critico";

export function toneOf(value: number): Tone {
  if (value >= 0.7) return "alto";
  if (value >= 0.5) return "medio";
  return "critico";
}

export const toneColor: Record<Tone, string> = {
  alto: "var(--good)",
  medio: "var(--warn)",
  critico: "var(--bad)",
};

export const toneLabel: Record<Tone, string> = {
  alto: "Alto",
  medio: "Medio",
  critico: "Crítico",
};

/** Average per indicator across a set of evaluations. */
export function indicadorAverages(evs: Evaluacion[]) {
  const ids = new Set(evs.map((e) => e.id));
  return indicadorCatalogo.map((c) => {
    const rows = indicadores.filter((i) => ids.has(i.ev) && i.n === c.n);
    return { ...c, valor: avg(rows.map((r) => r.cumpl)) };
  });
}

export function benchmark(evs: Evaluacion[]) {
  const propias = evs.filter((e) => e.concesionaria === MARCA_PROPIA);
  const otras = evs.filter((e) => e.concesionaria !== MARCA_PROPIA);
  const maquinarias = avg(propias.map((e) => e.puntaje));
  const competencia = avg(otras.map((e) => e.puntaje));
  return {
    maquinarias,
    competencia,
    brecha: maquinarias - competencia,
    nPropias: propias.length,
    nOtras: otras.length,
  };
}

/** Gap per indicator: Maquinarias vs competencia (percentage points). */
export function brechaPorIndicador(evs: Evaluacion[]) {
  const propias = new Set(evs.filter((e) => e.concesionaria === MARCA_PROPIA).map((e) => e.id));
  const otras = new Set(evs.filter((e) => e.concesionaria !== MARCA_PROPIA).map((e) => e.id));
  return indicadorCatalogo
    .map((c) => {
      const own = avg(indicadores.filter((i) => propias.has(i.ev) && i.n === c.n).map((i) => i.cumpl));
      const rival = avg(indicadores.filter((i) => otras.has(i.ev) && i.n === c.n).map((i) => i.cumpl));
      return { ...c, own, rival, gap: own - rival };
    })
    .sort((a, b) => a.own - b.own);
}

export type PreguntaAgg = {
  q: string;
  indicador: string;
  ind: number;
  valor: number;
  respuestas: { ev: string; local: string; resp: string | null; nota: number | null; obs: string | null }[];
};

export function preguntasAgregadas(evs: Evaluacion[]): PreguntaAgg[] {
  const byId = new Map(evs.map((e) => [e.id, e]));
  const map = new Map<string, PreguntaAgg>();
  for (const p of preguntas) {
    const ev = byId.get(p.ev);
    if (!ev || p.nota === null) continue;
    const key = `${p.ind}|${p.q}`;
    let entry = map.get(key);
    if (!entry) {
      entry = { q: p.q, indicador: p.indicador, ind: p.ind, valor: 0, respuestas: [] };
      map.set(key, entry);
    }
    entry.respuestas.push({
      ev: p.ev,
      local: labelOf(ev),
      resp: p.resp,
      nota: p.nota,
      obs: p.obs,
    });
  }
  const list = Array.from(map.values());
  for (const entry of list) {
    entry.valor = avg(entry.respuestas.map((r) => r.nota ?? 0));
  }
  return list.sort((a, b) => a.valor - b.valor);
}
