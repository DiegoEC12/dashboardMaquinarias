# Dashboard Maquinarias

Panel ejecutivo de Mystery Shopping para analizar evaluaciones de concesionarias, indicadores, locales, benchmark, ranking y preguntas críticas.

## Funcionalidades

- Resumen Ejecutivo con KPIs, benchmark, ranking, mapa de calor y preguntas críticas.
- Módulo Indicadores con los 12 indicadores, porcentajes, barras de progreso, locales, fortalezas y oportunidades.
- Módulo Benchmark para comparar Maquinarias contra la competencia.
- Módulo Concesionarias con ranking, mapa por indicador y detalle por local.
- Filtros globales con selección múltiple mediante checkboxes:
  - Concesionaria
  - Marca
  - Ubicación
  - Indicador
  - Tipo de evaluación: Venta, Callcenter, Seminuevos y Posventa
- Estado inicial de filtros en `Todas`, mostrando el universo completo.
- Deduplicación de locales por la combinación `concesionaria + marca + ubicación`.
- Importación de archivos `.xlsx` y `.xls` desde la interfaz.
- Restauración del dataset original después de una importación.

## Datos

El dataset base está en [src/data/mystery-shopping-imported.json](src/data/mystery-shopping-imported.json). El Excel de origen actual es `Base_Mystery_Shopping_Consolidada (8).xlsx` y contiene:

- 42 evaluaciones.
- 434 filas de indicadores.
- 2494 preguntas.
- 9756 opciones de respuesta.
- 12 indicadores únicos.

El snapshot normalizado se genera en [src/data/mystery-shopping-imported.json](src/data/mystery-shopping-imported.json). Para regenerarlo después de reemplazar el Excel:

```bash
npm run data:excel
```

El script [scripts/generate-imported-json.cjs](scripts/generate-imported-json.cjs) transforma las hojas `Evaluaciones`, `Indicadores` y `Preguntas` al formato lógico consumido por la aplicación. La hoja `Opciones` se conserva en el Excel para futuras necesidades de auditoría y detalle.

## Importación desde la aplicación

En el Resumen Ejecutivo se puede seleccionar **Importar Excel**. La aplicación valida las hojas requeridas y reemplaza los datos activos en memoria. Si el archivo no cumple la estructura mínima, conserva los datos actuales y muestra el error.

El botón **Restaurar datos** elimina los datos importados de la sesión y vuelve al dataset original. Esta restauración no modifica los archivos del proyecto.

La lógica está aislada en [src/lib/excel-import.ts](src/lib/excel-import.ts), para que en el futuro el mismo modelo pueda alimentarse desde una API o base de datos sin cambiar la UI.

## Desarrollo local

Requisitos: Node.js y npm.

```bash
npm install
npm run dev
```

El servidor de desarrollo queda disponible en la URL que indique Vite, normalmente `http://localhost:5173`.

## Validación

```bash
npx tsc --noEmit
npx prettier --check .
npm run build
```

## Tecnologías

- React 19 y TypeScript
- TanStack Start y TanStack Router
- Vite
- Tailwind CSS 4
- Radix UI
- Recharts
- `xlsx` para lectura de Excel
