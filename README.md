# Control GPRO · Cartera C3 2027

Tracker de la Gerencia de Proyectos (GPRO) de Minera Antucoya, en un solo archivo HTML.

**Abrir:** `index.html` en el navegador (no requiere instalar nada ni conexión a internet).

## Pestañas
- **Entregables:** matriz por proyecto e iniciativa (ingeniería, ensayos y mediciones), con seguimiento por etapas, hitos ADS (Checkpoint FEL 2A / FQAR), PPTO 2027 vs CB y ajustes de cartera.
- **Flujos financieros:** plan mensual oct-2026 a dic-2027 por iniciativa, curva S y cuadre contra el PPTO.
- **Control de costos:** estado de costos de 9 columnas (PCS-PR-015) por proyecto, con ítems desplegables y flujo mensual agrupable por año (CY26 · meses 2027 · CY28) y calce del presupuesto.

Los cambios se guardan en el navegador de quien abre el archivo. Con **⤓ Guardar copia** se descarga un HTML nuevo con los datos actuales, y **⤓ Excel** exporta todo a .xlsx.

## Código fuente
`src/` contiene el HTML, CSS, JS y los datos (`data.json`). Para regenerar `index.html`:

```
python3 build.py
```
