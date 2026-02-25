# GEOZONES.md

## Formato esperado de `polygon_json`
Para MVP se usa un arreglo JSON de puntos `{lat, lng}`:

```json
[
  { "lat": -34.6000, "lng": -58.4100 },
  { "lat": -34.6050, "lng": -58.4200 },
  { "lat": -34.5950, "lng": -58.4300 },
  { "lat": -34.6000, "lng": -58.4100 }
]
```

## Validaciones
- mínimo 3 puntos (sin contar cierre)
- si el polígono no está cerrado, el servicio cierra automáticamente agregando el primer punto al final
- tipos: `SAFE`, `CAUTION`, `RED`
- endpoint CRUD protegido con RBAC `admin|sos`

> Nota: se almacena en JSONB para permitir migrar a GeoJSON estricto o PostGIS sin romper API.
