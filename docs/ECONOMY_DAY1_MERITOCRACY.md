# Zippy – Modelo Económico (Meritocracia Día 1)

Este documento define el **modelo económico base** para operar Zippy desde el día 1 con meritocracia real:

- **Comisión por nivel (tier)**
- **Descuentos por performance mensual (bono)**
- **Piso de comisión (floor)** para proteger unit economics
- **Gates operativos** (peak hours / zonas premium) por score
- **Holds antifraude** que bloquean bonos y liquidaciones

> Implementación: las políticas/config se cargan automáticamente en DB al iniciar `ride` (idempotente).

---

## 1) Conceptos

### Zippy Score (0–100)
Score persistente por actor (DRIVER / PASSENGER). Impacta:

- Restricciones (WARNING/LIMITED/BLOCKED)
- Gate de horario pico
- Elegibilidad zonas premium
- Nivel (tier)

### Nivel (Tier)
Niveles visibles (BRONZE / SILVER / GOLD / DIAMOND) calculados por score + performance reciente.

### Comisión (BPS)
La comisión se expresa en **basis points**:

- 100 bps = 1%
- 1000 bps = 10%

---

## 2) Comisión por Tier (driver)

Política: `commission_tiers_bps` (key en `CommissionPolicy`).

| Tier | Comisión (bps) | Comisión (%) |
|------|----------------|--------------|
| BRONZE | 1200 | 12% |
| SILVER | 1050 | 10.5% |
| GOLD | 900 | 9% |
| DIAMOND | 800 | 8% |

Notas:
- **BRONZE** es el default.
- El tier se determina con reglas de `level_rules`.

---

## 3) Bonus mensual (descuento de comisión)

Política: `bonus_rules`.

El bono es un **descuento en bps** que se aplica por performance del mes anterior.

| Percentil | Descuento (bps) | Descuento (%) |
|----------|------------------|--------------|
| Top 10% | 200 | 2% |
| Top 3% | 350 | 3.5% |
| Top 1% | 500 | 5% |

Elegibilidad mínima:
- `min_trips_completed`: 25
- `require_no_show_eq`: 0
- `require_safety_major_alerts_eq`: 0

Regla antifraude:
- Si el driver tiene **hold activo** (`PAYOUT_HOLD` o `ACCOUNT_BLOCK`) o señales HIGH/CRITICAL, **no recibe bono**.

Vigencia:
- Se calcula para el mes **N** y se aplica durante el mes **N+1**.

---

## 4) Floor (piso) de comisión

Política: `bonus_rules.commission_floor_bps`

 - Piso: **300 bps (3%)**

La comisión final nunca puede quedar por debajo del piso:

`effective_bps = max(tier_bps - micro_discount_bps - discount_bps, floor_bps)`

---

## 4.1) Micro-ajuste por score dentro del tier

Política: `commission_micro_adjustment`.

Objetivo:
- Que el esfuerzo **se sienta día a día** (no solo al “subir de tier”).
- Mantener estabilidad (cap de descuento) y respetar el floor.

Implementación:
- Se toma el **score actual** del driver.
- Se calcula un **micro_discount_bps** según el tier.
- Se aplica junto al bonus mensual y luego el floor.

Cap:
- `max_discount_bps`: 250 (2.5%)

Ejemplo (BRONZE):
- score 65 → 0 bps
- score 75 → 50 bps
- score 85 → 100 bps
- score 92 → 150 bps

---

## 5) Meritocracia operativa

### 5.1 Peak Hours Gate
Config: `AppConfig.peak_hours`

Ventanas (Firmat / Sur de Santa Fe):
- Lun–Vie 06:30–09:30 (escuela/entrada laboral)
- Lun–Vie 12:00–14:00 (almuerzo/mandados)
- Lun–Vie 17:00–20:30 (salida laboral/escuela)
- Vie–Sáb 22:00–04:00 (nocturnidad)
- Domingo 17:30–21:00 (movimiento tarde-noche)

Umbrales:
- driver_min_score: 60
- passenger_min_score: 50

Si el usuario está `BLOCKED` → denegado.

### 5.2 Zonas Premium
Elegibilidad por score mínimo según `PremiumZone`.

Config adicional: `AppConfig.premium_zones`
- `deny_low_driver`: si es `true`, un driver no elegible **no puede** estar online en premium.
- `deny_low_passenger`: si es `true`, un pasajero no elegible **no puede** pedir viaje desde premium.

Si están en `false` (default Firmat):
- El usuario no se bloquea.
- Se aplica **depriorización** (ver matching).

---

## 5.3 Prioridad de matching (demanda) por meritocracia

Config: `AppConfig.matching_weights`

Además de score/distancia, el matching considera:
- **Tier** (BRONZE/SILVER/GOLD/DIAMOND) → mejor demanda
- Estado **limited** → penalización
- Zonas premium → bonus si es elegible

Esto asegura que la meritocracia impacte **plata** (comisión) y **demanda** (más viajes).

---

## 6) Fuente de verdad (implementación)

1) `ride` inicializa políticas/config (bootstrap)
2) `payment` calcula comisión preguntando a `ride`:

`GET /internal/commission/driver/:driverUserId?at=ISO_DATE`

Esto garantiza que:
- la comisión **sí** responda a tier + bonus + floor
- y evita duplicar lógica de niveles dentro de `payment`

---

## 7) Checklist de lanzamiento

- [ ] Verificar que `ride` levante y cree `CommissionPolicy` + `AppConfig` (logs de bootstrap).
- [ ] Verificar que `payment` tenga `RIDE_SERVICE_URL=http://ride:3002`.
- [ ] Probar un flujo completo: Trip COMPLETED → createPreference → comisión aplicada.
- [ ] Simular driver con bonus (MonthlyBonusLedger ACTIVE) y ver que baja comisión respetando floor.


## Ajuste fino (Step 3)

### Preferencia en zonas premium por Tier
- Config key: `premium_preference_by_tier`
- `eligible_additive_bonus`: bonus adicional (además del bonus base de zona) aplicado según tier.
- `ineligible_penalty`: penalización leve si está dentro de zona premium pero no cumple score mínimo (en Firmat se de-prioriza, no se deniega).

### Top-N dinámico (cantidad de drivers notificados)
- Config key: `dynamic_top_n`
- `base`: cantidad base
- `peak_add`: suma durante peak hours
- `premium_zone_add`: suma si el origen cae en zona premium activa
- `restricted_passenger_cap`: tope cuando el pasajero está en modo limitado
- `limited_max_share`: máximo % de drivers limitados dentro de los notificados
- `reserve_high_tier`: reserva de slots para GOLD/DIAMOND cuando hay disponibles
