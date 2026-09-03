import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { EMPTY_FILTERS, type GlobalFilters } from "./calculations";
import { dataset } from "./dataset";
import { importExcelFile, resetImportedData } from "@/lib/excel-import";

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

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<GlobalFilters>(EMPTY_FILTERS);
  const [selectedIndicadorId, setSelectedIndicadorId] = useState<string | null>(null);
  const [selectedEvaluacionId, setSelectedEvaluacionId] = useState<string | null>(null);
  const [selectedPreguntaId, setSelectedPreguntaId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const navigate = useNavigate();

  const setFilter = useCallback((key: keyof GlobalFilters, value: string[] | null) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "concesionaria") {
        next.marca = null;
        next.ubicacion = null;
      }
      if (key === "marca") next.ubicacion = null;
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const options = useMemo(() => {
    const by = (
      fn: (e: (typeof dataset.evaluations)[number]) => boolean,
      key: "periodo" | "concesionaria" | "marca" | "ubicacion",
    ) =>
      [...new Set(dataset.evaluations.filter(fn).map((e) => e[key]))].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
    return {
      periodos: by(() => true, "periodo"),
      concesionarias: by(
        (e) => !filters.periodo || filters.periodo.includes(e.periodo),
        "concesionaria",
      ),
      marcas: by(
        (e) =>
          (!filters.periodo || filters.periodo.includes(e.periodo)) &&
          (!filters.concesionaria || filters.concesionaria.includes(e.concesionaria)),
        "marca",
      ),
      ubicaciones: by(
        (e) =>
          (!filters.periodo || filters.periodo.includes(e.periodo)) &&
          (!filters.concesionaria || filters.concesionaria.includes(e.concesionaria)) &&
          (!filters.marca || filters.marca.includes(e.marca)),
        "ubicacion",
      ),
      tiposEvaluacion: ["Venta", "Callcenter", "Seminuevos", "Posventa"],
    };
  }, [dataVersion, filters.periodo, filters.concesionaria, filters.marca]);

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
