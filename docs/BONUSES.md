# Monthly Bonuses

El bono mensual de conductores se materializa como `COMMISSION_DISCOUNT` en bps.

## Flujo
1. `computeMonthlyPerformance(year, month)`
2. `computeMonthlyBonuses(year, month)`
3. Se crea/actualiza `MonthlyBonusLedger` (idempotente)

## Reglas por defecto
- TOP 10% => 300 bps
- TOP 3% => 500 bps
- TOP 1% => 800 bps

## Endpoints
- `GET /admin/bonuses?year=&month=`
- `POST /admin/bonuses/:id/revoke`
