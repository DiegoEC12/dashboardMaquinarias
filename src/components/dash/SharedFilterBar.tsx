import { useMemo } from "react";
import { FilterBar } from "./FilterBar";
import { useFilters } from "@/lib/mystery/filter-context";

/** Adaptador que expone el `FilterBar` del panel ejecutivo usando el `FilterProvider`. */
export function SharedFilterBar() {
  const { filters, setFilter, clearFilters, options, hasFilters, activeLabel, openIndicador, clearIndicador } = useFilters();

  // Mapear el estado del context a la forma esperada por `FilterBar` (lib/analytics Filters)
  const fbFilters = useMemo(() => {
    return {
      concesionaria: filters.concesionaria ?? "all",
      marca: filters.marca ?? "all",
      ubicacion: filters.ubicacion ?? "all",
      indicador: "all",
    };
  }, [filters.concesionaria, filters.marca, filters.ubicacion]);

  const onChange = (patch: Partial<{ concesionaria: string; marca: string; ubicacion: string; indicador: string }>) => {
    if (patch["concesionaria"] !== undefined)
      setFilter("concesionaria", patch["concesionaria"] === "all" ? null : (patch["concesionaria"] as string));
    if (patch["marca"] !== undefined) setFilter("marca", patch["marca"] === "all" ? null : (patch["marca"] as string));
    if (patch["ubicacion"] !== undefined)
      setFilter("ubicacion", patch["ubicacion"] === "all" ? null : (patch["ubicacion"] as string));
    if (patch["indicador"] !== undefined) {
      if (patch["indicador"] === "all") clearIndicador();
      else {
        const n = Number(patch["indicador"]);
        if (Number.isFinite(n)) openIndicador(`IND_${String(n).padStart(2, "0")}`);
      }
    }
  };

  const onReset = () => {
    clearFilters();
    clearIndicador();
  };

  const activeCount = useMemo(() => (hasFilters ? activeLabel.split(" · ").length : 0), [hasFilters, activeLabel]);

  return <FilterBar filters={fbFilters as any} onChange={onChange as any} onReset={onReset} activeCount={activeCount} />;
}

export default SharedFilterBar;
