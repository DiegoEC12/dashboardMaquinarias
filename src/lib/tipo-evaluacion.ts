function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeTipoEvaluacion(value: unknown, fallback = "Venta"): string {
  const raw = String(value ?? "").trim();
  const key = normalizeKey(raw);

  if (!key) return fallback;
  if (key.includes("callcenter") || key === "call") return "Call Center";
  if (key.includes("seminuevo") || key.includes("seminuevos")) return "Seminuevos";
  if (key.includes("venta") || key.includes("ventas")) return "Ventas";

  return raw;
}

export function includesTipoEvaluacion(selected: string[] | null, value: unknown): boolean {
  if (!selected) return true;
  const currentKey = normalizeKey(normalizeTipoEvaluacion(value));
  return selected.some((item) => normalizeKey(normalizeTipoEvaluacion(item)) === currentKey);
}

export function coerceSingleTipoEvaluacion(values: string[] | null, fallback = "Ventas"): string[] {
  if (values === null) return [normalizeTipoEvaluacion(fallback)];
  const cleaned = values
    .map((item) => normalizeTipoEvaluacion(item))
    .filter((item) => item.trim().length > 0);
  if (!cleaned.length) return [normalizeTipoEvaluacion(fallback)];
  return [cleaned[0]];
}
