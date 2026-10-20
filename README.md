# Control GPRO · Cartera C3 2027

Tracker de la Gerencia de Proyectos (GPRO) de Minera Antucoya, en un solo archivo HTML.

**Abrir:** https://andrykallard.github.io/Control-GPRO/ — los datos viven en una sola base en la nube (Supabase, proyecto `control-gpro`): todos ven lo mismo y los cambios se guardan en línea y aparecen en vivo. No requiere login: cualquiera con el link puede ver y editar. Cada edición o borrado queda en un historial para poder recuperarlo.

`local.html` es la versión sin conexión (datos incluidos, guarda solo en el navegador).

## Pestañas
- **Entregables:** matriz por proyecto e iniciativa (ingeniería, ensayos y mediciones), con seguimiento por etapas, hitos ADS (Checkpoint FEL 2A / FQAR), PPTO 2027 vs CB y ajustes de cartera.
- **Flujos financieros:** plan mensual oct-2026 a dic-2027 por iniciativa, curva S y cuadre contra el PPTO.
- **Control de costos:** estado de costos de 9 columnas (PCS-PR-015) por proyecto, con ítems desplegables y flujo mensual agrupable por año (CY26 · meses 2027 · CY28) y calce del presupuesto.

**⤓ Excel** exporta todo a .xlsx.

## Código fuente
`src/` contiene el HTML, CSS, JS y los datos (`data.json`). Para regenerar `index.html` (nube), `local.html` y `supabase/seed.sql`:

```
python3 build.py
```

## Base de datos
`supabase/schema.sql` crea la tabla `gpro_docs` (un documento JSON por proyecto, iniciativa, ajuste o reporte de costos) y el historial `gpro_historial`. `supabase/seed.sql` carga los datos iniciales.
