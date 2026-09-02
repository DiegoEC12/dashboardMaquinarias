// Header simplificado: sin selects de filtro embebidos.

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  // ya no se usan filtros en el header
  return (
    <header className="border-b border-border bg-card/60 px-5 py-4 backdrop-blur-sm md:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 max-xl:flex max-xl:flex-col max-xl:items-start">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
        </div>
        {/* filtros eliminados del header; usar `FilterBar` o `CompactFilterControls` según la página */}
      </div>
      {/* activeLabel oculto en header principal */}
    </header>
  );
}
