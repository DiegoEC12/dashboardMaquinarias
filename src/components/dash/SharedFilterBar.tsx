import { useMemo } from "react";
import { FilterBar } from "./FilterBar";
import { useFilters } from "@/lib/mystery/filter-context";

/** Adaptador que expone el `FilterBar` del panel ejecutivo usando el `FilterProvider`. */
export function SharedFilterBar() {
  const {
    filters,
    setFilter,
    clearFilters,
    options,
    hasFilters,
    activeLabel,
    openIndicador,
    clearIndicador,
  } = useFilters();

  // Mapear el estado del context a la forma esperada por `FilterBar` (lib/analytics Filters)
  const fbFilters = useMemo(() => {
    return {
      concesionaria: filters.concesionaria,
      marca: filters.marca,
      ubicacion: filters.ubicacion,
      indicador: filters.indicador,
      tipoEvaluacion: filters.tipoEvaluacion,
    };
  }, [
    filters.concesionaria,
    filters.marca,
    filters.ubicacion,
    filters.tipoEvaluacion,
    filters.indicador,
  ]);

  const onChange = (patch: Partial<import("@/lib/analytics").Filters>) => {
    if (patch.concesionaria !== undefined) setFilter("concesionaria", patch.concesionaria);
    if (patch.marca !== undefined) setFilter("marca", patch.marca);
    if (patch.ubicacion !== undefined) setFilter("ubicacion", patch.ubicacion);
    if (patch.tipoEvaluacion !== undefined) setFilter("tipoEvaluacion", patch.tipoEvaluacion);
    if (patch.indicador !== undefined) {
      if (patch.indicador !== undefined) setFilter("indicador", patch.indicador);
      if (!patch.indicador || patch.indicador.length !== 1) clearIndicador();
      else {
        const n = Number(patch.indicador[0]);
        if (Number.isFinite(n)) openIndicador(`IND_${String(n).padStart(2, "0")}`);
      }
    }
  };

  const onReset = () => {
    clearFilters();
    clearIndicador();
  };

  const activeCount = useMemo(
    () => (hasFilters ? activeLabel.split(" · ").length : 0),
    [hasFilters, activeLabel],
  );

  return (
    <FilterBar
      filters={fbFilters}
      onChange={onChange}
      onReset={onReset}
      activeCount={activeCount}
    />
  );
}

export default SharedFilterBar;
