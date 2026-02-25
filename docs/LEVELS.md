# Levels (Sprint 7)

Niveles dinámicos por actor (`DRIVER` y `PASSENGER`) calculados por cron diario y por eventos de viaje.

## Tiers
- BRONZE
- SILVER
- GOLD
- DIAMOND

## Señales usadas
- score vigente
- viajes completados ventana móvil
- cancel_rate
- no_show_count
- safety_major_alerts (driver)

## Endpoints
- `GET /admin/levels?actor_type=&tier=`
