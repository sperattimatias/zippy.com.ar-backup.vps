# MERITOCRACY.md

La capa Meritocracy usa Zippy Score para operar sin exponer score numérico al usuario final.

## Principios
- Se expone solo badge (`EXCELLENT`, `TRUSTED`, `WATCHLIST`, `RESTRICTED`).
- Score numérico queda para Admin/SOS.
- Matching y gates usan score/status/restricciones/config dinámica.

## Impacto
- Prioridad de matching multicriterio.
- Gates en horarios pico.
- Elegibilidad en zonas premium.
- Recovery sistematizado para salir de LIMITED/BLOCKED.
