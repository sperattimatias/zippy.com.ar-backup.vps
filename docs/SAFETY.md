# SAFETY.md

## Objetivo
Sprint 4 agrega controles proactivos para detectar señales de riesgo durante un viaje y notificar a pasajeros y equipos SOS/Admin.

## Reglas MVP
- **Entrada a zonas**:
  - RED: alerta `ENTERED_RED_ZONE`, severidad 5, `safety_score -25`.
  - CAUTION: alerta `ENTERED_CAUTION_ZONE`, severidad 3, `safety_score -10`.
- **Desvío de ruta** (baseline heurística):
  - >300m sostenidos 20s: `ROUTE_DEVIATION_MINOR`, `-5`.
  - >700m sostenidos 20s: `ROUTE_DEVIATION_MAJOR`, `-15`.
  - 2 eventos major en mismo trip: alerta major adicional por repetición.
- **Tracking perdido**:
  - >15s sin ubicación: `TRACKING_LOST` minor, `-5`.
  - >45s sin ubicación: `TRACKING_LOST` major, `-15`.
- **OTP fallido múltiple**:
  - Desde el 3er fallo de OTP: `OTP_FAILED_MULTIPLE`.

## Thresholds de score
- `<= 70`: evento realtime `safety.checkin_required`.
- `<= 50`: se crea alerta `MANUAL_SOS_TRIGGER`.
- `<= 35`: se registra evento `trip.safety.flagged`.

## Auditoría
Cada alerta se guarda en `SafetyAlert` y también en `TripEvent` como `trip.safety.alert_created`.
