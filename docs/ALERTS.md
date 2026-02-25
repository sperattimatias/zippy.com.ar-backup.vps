# ALERTS.md

## Estados de alerta
- `OPEN`: alerta nueva, pendiente de acción.
- `ACKNOWLEDGED`: tomada por operador (admin/sos).
- `RESOLVED`: mitigada/cerrada.
- `DISMISSED`: descartada por falso positivo.

## Flujo operativo SOS/Admin
1. listar alertas (`GET /api/admin/safety-alerts`)
2. filtrar por `status` si hace falta
3. abrir detalle desde payload/trip
4. actualizar estado (`PATCH /api/admin/safety-alerts/:id`)

## Realtime
- `safety.alert` para room del viaje (`trip:{id}`)
- `sos.alert.created` y `sos.alert.updated` para room `sos:alerts`

## Auditoría
Además del registro en `SafetyAlert`, toda creación queda en `TripEvent` para trazabilidad.
