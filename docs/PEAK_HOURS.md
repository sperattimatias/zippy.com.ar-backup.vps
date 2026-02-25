# PEAK_HOURS.md

Config key: `peak_hours`.

Estructura:
```json
{
  "timezone": "America/Argentina/Cordoba",
  "windows": [{ "days": [1,2,3,4,5], "start": "07:00", "end": "09:00" }],
  "driver_min_score": 50,
  "passenger_min_score": 45
}
```

Soporta cruce de medianoche (`23:00` -> `04:00`).
