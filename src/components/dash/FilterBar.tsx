import { RotateCcw } from "lucide-react";
import logoAsset from "@/assets/logo-maquinarias.png.asset.json";
import { Button } from "@/components/ui/button";
import { MultiFilterSelect } from "./MultiFilterSelect";
import {
  concesionarias,
  indicadorCatalogo,
  marcas,
  title,
  ubicaciones,
  type Filters,
} from "@/lib/analytics";

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  activeCount: number;
};

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string[] | null;
  options: { value: string; label: string }[];
  onValueChange: (value: string[] | null) => void;
}) {
  return (
    <MultiFilterSelect label={label} values={value} options={options} onChange={onValueChange} />
  );
}

export function FilterBar({ filters, onChange, onReset, activeCount }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-350 flex-col gap-3 px-4 py-3 lg:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 border-l border-border pl-3 sm:block">
              <p className="truncate text-2xl font-display font-semibold tracking-tight">
                Panel Ejecutivo
              </p>
              <p className="truncate text-sm text-muted-foreground">Mystery Shopping</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={activeCount === 0}
            className="shrink-0 gap-2 rounded-full text-muted-foreground hover:text-primary"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Limpiar filtros</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <FilterSelect
            label="Concesionaria"
            value={filters.concesionaria}
            onValueChange={(v) => onChange({ concesionaria: v })}
            options={concesionarias.map((c) => ({ value: c, label: title(c) }))}
          />
          <FilterSelect
            label="Marca"
            value={filters.marca}
            onValueChange={(v) => onChange({ marca: v })}
            options={marcas.map((m) => ({ value: m, label: title(m) }))}
          />
          <FilterSelect
            label="Ubicación"
            value={filters.ubicacion}
            onValueChange={(v) => onChange({ ubicacion: v })}
            options={ubicaciones.map((u) => ({ value: u, label: title(u) }))}
          />
          <FilterSelect
            label="Indicador"
            value={filters.indicador}
            onValueChange={(v) => onChange({ indicador: v })}
            options={indicadorCatalogo.map((i) => ({ value: String(i.n), label: i.nombre }))}
          />
          <MultiFilterSelect
            label="Tipo de evaluación"
            values={filters.tipoEvaluacion}
            options={[
              { value: "Venta", label: "Venta" },
              { value: "Callcenter", label: "Callcenter" },
              { value: "Seminuevos", label: "Seminuevos" },
              { value: "Posventa", label: "Posventa" },
            ]}
            onChange={(values) => onChange({ tipoEvaluacion: values })}
          />
        </div>
      </div>
    </header>
  );
}
