import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { EMPTY_FILTERS, type GlobalFilters } from "./calculations";
import { dataset } from "./dataset";

interface FilterContextValue {
  filters: GlobalFilters;
  setFilter: (key: keyof GlobalFilters, value: string | null) => void;
  clearFilters: () => void;
  hasFilters: boolean;
  activeLabel: string;
  options: {
    periodos: string[];
    concesionarias: string[];
    marcas: string[];
    ubicaciones: string[];
  };
  selectedIndicadorId: string | null;
  openIndicador: (id: string) => void;
  clearIndicador: () => void;
  selectedEvaluacionId: string | null;
  openEvaluacion: (id: string) => void;
  selectedPreguntaId: string | null;
  openPregunta: (indicadorId: string, preguntaId: string) => void;
  clearPregunta: () => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<GlobalFilters>(EMPTY_FILTERS);
  const [selectedIndicadorId, setSelectedIndicadorId] = useState<string | null>(null);
  const [selectedEvaluacionId, setSelectedEvaluacionId] = useState<string | null>(null);
  const [selectedPreguntaId, setSelectedPreguntaId] = useState<string | null>(null);
  const navigate = useNavigate();

  const setFilter = useCallback((key: keyof GlobalFilters, value: string | null) => {
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
    const by = (fn: (e: (typeof dataset.evaluations)[number]) => boolean, key: "periodo" | "concesionaria" | "marca" | "ubicacion") =>
      [...new Set(dataset.evaluations.filter(fn).map((e) => e[key]))].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
    return {
      periodos: by(() => true, "periodo"),
      concesionarias: by(
        (e) => !filters.periodo || e.periodo === filters.periodo,
        "concesionaria",
      ),
      marcas: by(
        (e) =>
          (!filters.periodo || e.periodo === filters.periodo) &&
          (!filters.concesionaria || e.concesionaria === filters.concesionaria),
        "marca",
      ),
      ubicaciones: by(
        (e) =>
          (!filters.periodo || e.periodo === filters.periodo) &&
          (!filters.concesionaria || e.concesionaria === filters.concesionaria) &&
          (!filters.marca || e.marca === filters.marca),
        "ubicacion",
      ),
    };
  }, [filters.periodo, filters.concesionaria, filters.marca]);

  const hasFilters = Object.values(filters).some(Boolean);
  const activeLabel = hasFilters
    ? [filters.periodo, filters.concesionaria, filters.marca, filters.ubicacion]
        .filter(Boolean)
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
  };

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters debe usarse dentro de FilterProvider");
  return ctx;
}
