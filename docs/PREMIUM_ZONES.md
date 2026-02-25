# PREMIUM_ZONES.md

`PremiumZone` define geocercas para prioridad y elegibilidad.

Campos clave:
- `min_driver_score`
- `min_passenger_score`
- `polygon_json`

Comportamiento MVP:
- Si no elegible, se degrada prioridad.
- Opcionalmente puede denegar via config `premium_zones` (`deny_low_driver`, `deny_low_passenger`).
