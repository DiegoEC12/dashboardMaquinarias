# AVANCES — Integración Benchmark y Concesionarias

Fecha: (actualizar) 

Resumen
- Base: proyecto `dashboardMaquinarias` usado como base.
- Objetivo: agregar módulos "Benchmark" y "Concesionarias" y dejar documentado el proceso.

Archivos añadidos
- `src/routes/benchmark.tsx` — nueva ruta de Benchmark (gráficos y descripción comparativa).
- `src/routes/concesionarias.tsx` — nueva ruta para ranking y drill-down por concesionaria.

Componentes y librerías reutilizadas
- `src/components/mystery/*` — `page-header`, `charts`, `primitives`, `app-sidebar` (ya integrados).
- `src/lib/mystery/*` — `calculations`, `dataset`, `filter-context`, `format`, `types` (ya integrados).

Próximos pasos / recomendaciones
1. Ejecutar instalación y levantar dev server:
   - `pnpm install` o `npm install`
   - `pnpm dev` o `npm run dev` (inicia Vite)
2. Verificar rutas en `routeTree.gen.ts` y regenerar si es necesario (TanStack Router file-routes).
3. Revisar assets y alias `@/` si hay errores de import (ajustar `tsconfig.json` / Vite).
4. Realizar pruebas manuales de navegación y filtros (abrir Benchmark y Concesionarias, probar filtrado y drill).

Notas
- Las páginas nuevas usan `useFilters()` para aplicar y navegar filtros. Al hacer click en una concesionaria se aplica el filtro de concesionaria.
- Documentar cambios adicionales que surjan durante la validación (errores runtime, assets faltantes).

Si quieres, continuo con:
- regenerar `routeTree.gen.ts` y probar `vite dev`.
- ajustar imports de assets/logo si aparece algún error.

Cambios recientes:
- Reemplazados los filtros en las páginas `Benchmark` y `Concesionarias` por un componente compacto de filtros (solo selects y botón "Limpiar filtros"). El `Resumen Ejecutivo` conserva la barra completa con logo y título.
- Eliminado el ítem "Hallazgos" del sidebar y redirigida la acción de abrir una evaluación al resumen ejecutivo.
- Eliminado el ítem "Hallazgos" del sidebar y redirigida la acción de abrir una evaluación al resumen ejecutivo.

- Eliminado el conjunto de selects de filtro embebidos en `PageHeader` (ahora el header solo muestra título y descripción). Las páginas usan ahora:
   - `Resumen Ejecutivo`: `FilterBar` (barra completa con logo y título)
   - `Benchmark` y `Concesionarias`: `CompactFilterControls` (solo selects + botón limpiar)

- `Concesionarias`: portada completa desde `insight-navigator-bk` — ranking, drill-down y panel analítico portados. El mapa de calor original fue reemplazado por el mapa usado en `Resumen Ejecutivo` (component `Heatmap` en `src/components/dash/Heatmap.tsx`), y las evaluaciones se adaptaron al formato esperado. `useFilters` se usa como fuente única de filtros. TypeScript checks pasan (`npx tsc --noEmit`).
 - `Indicadores`: añadido módulo que agrupa los 12 indicadores, permite seleccionar un indicador para ver su desglose por local y muestra un sidebar con las preguntas que explican la nota (promedio y muestras). Colores de estado aplicados a los indicadores y a los locales (alto/medio/crítico). TypeScript checks pasan (`npx tsc --noEmit`).
 - `Indicadores`: añadido módulo que agrupa los 12 indicadores, permite seleccionar un indicador para ver su desglose por local y muestra un sidebar con las preguntas que explican la nota (promedio y muestras). Se añadió `CompactFilterControls` para exponer los filtros globales aquí. Colores de estado aplicados a los indicadores y a los locales (óptimo ≥85%, observación 70–84%, crítico <70%). TypeScript checks pasan (`npx tsc --noEmit`).

Cambios transversales:
- Umbrales globales de estado actualizados en `src/lib/mystery/calculations.ts`: `ALTO = 0.85`, `MEDIO = 0.7` para alinear colores/semáforo en todos los módulos.

Prueba realizada: servidor dev iniciado en http://localhost:8081/ — verificar que los filtros compactos aparecen en `Benchmark` y `Concesionarias` y que el `Resumen Ejecutivo` mantiene su cabecera original.

- Ajuste visual reciente: añadido mapeo en `src/styles.css` para las clases legacy `bg-alto|bg-medio|bg-bajo` y aliases `bg-success|bg-warning|bg-danger`, más selectores catch-all para variantes con sufijos (p. ej. `bg-danger/15`). Esto asegura que los progress bars y barras de resultado muestren los colores semáforo correctamente.
