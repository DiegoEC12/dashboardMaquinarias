import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo } from "react";
import { useFilters } from "@/lib/mystery/filter-context";
import { dataset } from "@/lib/mystery/dataset";

function FilterSelect({ label, value, options, onValueChange }: { label: string; value: string | null; options: { value: string; label: string }[]; onValueChange: (v: string) => void }) {
  return (
    <Select value={value ?? "all"} onValueChange={onValueChange}>
      <SelectTrigger
        className="h-10 min-w-0 rounded-full border-border bg-card px-4 text-sm font-medium shadow-none data-[state=open]:ring-2 data-[state=open]:ring-ring/30"
        aria-label={label}
      >
        <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:inline">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value="all">Todas</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CompactFilterControls() {
  const { filters, setFilter, clearFilters, hasFilters, activeLabel, options, openIndicador, clearIndicador } = useFilters();

  const indicadorOptions = useMemo(() => {
    return dataset.indicators.map((i) => ({ value: String(i.orden), label: i.nombre }));
  }, []);

  const activeCount = useMemo(() => (hasFilters ? activeLabel.split(" · ").length : 0), [hasFilters, activeLabel]);

  return (
    <div className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3 lg:px-8">
        <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-4">
          <FilterSelect label="Concesionaria" value={filters.concesionaria} options={options.concesionarias.map((c) => ({ value: c, label: c }))} onValueChange={(v) => setFilter("concesionaria", v === "all" ? null : v)} />
          <FilterSelect label="Marca" value={filters.marca} options={options.marcas.map((m) => ({ value: m, label: m }))} onValueChange={(v) => setFilter("marca", v === "all" ? null : v)} />
          <FilterSelect label="Ubicación" value={filters.ubicacion} options={options.ubicaciones.map((u) => ({ value: u, label: u }))} onValueChange={(v) => setFilter("ubicacion", v === "all" ? null : v)} />
          <FilterSelect label="Indicador" value={null} options={indicadorOptions} onValueChange={(v) => (v === "all" ? clearIndicador() : openIndicador(`IND_${String(Number(v)).padStart(2, "0")}`))} />
        </div>

        <div className="ml-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => { clearFilters(); clearIndicador(); }} disabled={!hasFilters} className="shrink-0 gap-2 rounded-full text-muted-foreground hover:text-primary">
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Limpiar filtros</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{activeCount}</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CompactFilterControls;
