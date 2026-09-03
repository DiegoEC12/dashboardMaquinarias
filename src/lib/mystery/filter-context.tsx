import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EMPTY_FILTERS, type GlobalFilters } from "./calculations";
import { dataset } from "./dataset";
import {
  applyImportedPayload,
  hydrateImportedDataFromStorage,
  importExcelFile,
  loadPersistedImportedPayload,
  resetImportedData,
} from "@/lib/excel-import";
import { coerceSingleTipoEvaluacion, includesTipoEvaluacion } from "@/lib/tipo-evaluacion";

const didHydrateAtStartup = hydrateImportedDataFromStorage();

interface FilterContextValue {
  filters: GlobalFilters;
  setFilter: (key: keyof GlobalFilters, value: string[] | null) => void;
  clearFilters: () => void;
  hasFilters: boolean;
  activeLabel: string;
  options: {
    periodos: string[];
    concesionarias: string[];
    marcas: string[];
    ubicaciones: string[];
    tiposEvaluacion: string[];
    indicadores: { value: string; label: string }[];
  };
  selectedIndicadorId: string | null;
  openIndicador: (id: string) => void;
  clearIndicador: () => void;
  selectedEvaluacionId: string | null;
  openEvaluacion: (id: string) => void;
  selectedPreguntaId: string | null;
  openPregunta: (indicadorId: string, preguntaId: string) => void;
  clearPregunta: () => void;
  importExcel: (file: File) => Promise<void>;
  importError: string | null;
  dataVersion: number;
  resetImportedData: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

function indicatorSelectionToId(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? `IND_${String(n).padStart(2, "0")}` : value;
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<GlobalFilters>(EMPTY_FILTERS);
  const [selectedIndicadorId, setSelectedIndicadorId] = useState<string | null>(null);
  const [selectedEvaluacionId, setSelectedEvaluacionId] = useState<string | null>(null);
  const [selectedPreguntaId, setSelectedPreguntaId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(didHydrateAtStartup ? 1 : 0);
  const navigate = useNavigate();

  useEffect(() => {
    if (didHydrateAtStartup) return;
    const persistedPayload = loadPersistedImportedPayload();
    if (!persistedPayload) return;
    applyImportedPayload(persistedPayload);
    setDataVersion((version) => version + 1);
  }, []);

  const setFilter = useCallback((key: keyof GlobalFilters, value: string[] | null) => {
    setFilters((prev) => {
      const next = {
        ...prev,
        [key]: key === "tipoEvaluacion" ? coerceSingleTipoEvaluacion(value) : value,
      };

      const matches = (evaluation: (typeof dataset.evaluations)[number], filters: GlobalFilters) =>
        (!filters.periodo || filters.periodo.includes(evaluation.periodo)) &&
        (!filters.concesionaria || filters.concesionaria.includes(evaluation.concesionaria)) &&
        (!filters.marca || filters.marca.includes(evaluation.marca)) &&
        (!filters.ubicacion || filters.ubicacion.includes(evaluation.ubicacion)) &&
        includesTipoEvaluacion(filters.tipoEvaluacion, evaluation.tipoEvaluacion);

      const scopedEvaluations = dataset.evaluations.filter((evaluation) => matches(evaluation, next));
      const allowed = {
        periodo: new Set(scopedEvaluations.map((evaluation) => evaluation.periodo)),
        concesionaria: new Set(scopedEvaluations.map((evaluation) => evaluation.concesionaria)),
        marca: new Set(scopedEvaluations.map((evaluation) => evaluation.marca)),
        ubicacion: new Set(scopedEvaluations.map((evaluation) => evaluation.ubicacion)),
        tipoEvaluacion: new Set(scopedEvaluations.map((evaluation) => evaluation.tipoEvaluacion)),
      };

      const scopedEvalIds = new Set(scopedEvaluations.map((evaluation) => evaluation.id));
      const allowedIndicatorIds = new Set(
        dataset.indicatorResults
          .filter((result) => scopedEvalIds.has(result.idEvaluacion))
          .map((result) => result.idIndicador),
      );

      const prune = (filterKey: keyof typeof allowed) => {
        const current = next[filterKey];
        if (current === null) return;
        const compatible = current.filter((item) => allowed[filterKey].has(item));
        next[filterKey] = compatible;
      };

      prune("periodo");
      prune("concesionaria");
      prune("marca");
      prune("ubicacion");
      prune("tipoEvaluacion");

      if (next.indicador !== null) {
        next.indicador = next.indicador.filter((value) =>
          allowedIndicatorIds.has(indicatorSelectionToId(value)),
        );
      }

      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const options = useMemo(() => {
    const matches = (
      evaluation: (typeof dataset.evaluations)[number],
      criteria: Partial<GlobalFilters>,
    ) =>
      (!criteria.periodo || criteria.periodo.includes(evaluation.periodo)) &&
      (!criteria.concesionaria || criteria.concesionaria.includes(evaluation.concesionaria)) &&
      (!criteria.marca || criteria.marca.includes(evaluation.marca)) &&
      (!criteria.ubicacion || criteria.ubicacion.includes(evaluation.ubicacion)) &&
      includesTipoEvaluacion(criteria.tipoEvaluacion ?? null, evaluation.tipoEvaluacion);

    const optionsFor = (
      key: "periodo" | "concesionaria" | "marca" | "ubicacion" | "tipoEvaluacion",
    ) => {
      const criteria: Partial<GlobalFilters> = { ...filters };
      criteria[key] = null;

      return [
        ...new Set(
          dataset.evaluations
            .filter((evaluation) => matches(evaluation, criteria))
            .map((evaluation) => evaluation[key])
            .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
        ),
      ].sort((a, b) => a.localeCompare(b, "es"));
    };

    const baseCriteria: Partial<GlobalFilters> = {
      ...filters,
      indicador: null,
    };
    const baseEvaluations = dataset.evaluations.filter((evaluation) => matches(evaluation, baseCriteria));
    const baseIds = new Set(baseEvaluations.map((evaluation) => evaluation.id));
    const availableIndicatorIds = new Set(
      dataset.indicatorResults
        .filter((result) => baseIds.has(result.idEvaluacion))
        .map((result) => result.idIndicador),
    );
    const indicadores = dataset.indicators
      .filter((indicator) => availableIndicatorIds.has(indicator.id))
      .sort((a, b) => a.orden - b.orden)
      .map((indicator) => ({
        value:
          Number.isFinite(indicator.orden) && indicator.orden > 0
            ? String(indicator.orden)
            : indicator.id,
        label: indicator.nombre,
      }));

    return {
      periodos: optionsFor("periodo"),
      concesionarias: optionsFor("concesionaria"),
      marcas: optionsFor("marca"),
      ubicaciones: optionsFor("ubicacion"),
      tiposEvaluacion: optionsFor("tipoEvaluacion"),
      indicadores,
    };
  }, [
    dataVersion,
    filters.periodo,
    filters.concesionaria,
    filters.marca,
    filters.ubicacion,
    filters.tipoEvaluacion,
  ]);

  const hasFilters = Object.values(filters).some((values) => values !== null && values.length > 0);
  const activeLabel = hasFilters
    ? Object.values(filters)
        .filter((values) => values !== null && values.length > 0)
        .map((values) => values.join(", "))
        .join(" · ")
    : "Todas las evaluaciones";

  const openIndicador = useCallback(
    (id: string) => {
      setSelectedIndicadorId(id);
      void navigate({ to: "/indicadores" as any });
    },
    [navigate],
  );

  const clearIndicador = useCallback(() => setSelectedIndicadorId(null), []);

  const openEvaluacion = useCallback(
    (id: string) => {
      setSelectedEvaluacionId(id);
      void navigate({ to: "/" });
    },
    [navigate],
  );

  const openPregunta = useCallback(
    (indicadorId: string, preguntaId: string) => {
      setSelectedIndicadorId(indicadorId);
      setSelectedPreguntaId(preguntaId);
      void navigate({ to: "/indicadores" as any });
    },
    [navigate],
  );

  const clearPregunta = useCallback(() => setSelectedPreguntaId(null), []);

  const importExcel = useCallback(async (file: File) => {
    try {
      setImportError(null);
      await importExcelFile(file);
      setDataVersion((version) => version + 1);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "No se pudo importar el Excel.");
    }
  }, []);

  const restoreDataset = useCallback(() => {
    resetImportedData();
    setImportError(null);
    setDataVersion((version) => version + 1);
  }, []);

  const value: FilterContextValue = {
    filters,
    setFilter,
    clearFilters,
    hasFilters,
    activeLabel,
    options,
    selectedIndicadorId,
    openIndicador,
    clearIndicador,
    selectedEvaluacionId,
    openEvaluacion,
    selectedPreguntaId,
    openPregunta,
    clearPregunta,
    importExcel,
    importError,
    dataVersion,
    resetImportedData: restoreDataset,
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters debe usarse dentro de FilterProvider");
  return ctx;
}
