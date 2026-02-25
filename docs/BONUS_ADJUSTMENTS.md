# Bonus Adjustments (Sprint 10.1)

## Model
`BonusAdjustment`
- `driver_user_id`
- `year`, `month`
- `amount`
- `reason`
- `status`: `PENDING | APPLIED`
- `payload_json`

## Rules
- If a full refund affects a closed month, create `BonusAdjustment` with `revoke_next_month_discount` payload.
- Admin can inspect pending adjustments and apply them.

## Endpoints
- `GET /admin/finance/bonus-adjustments`
- `POST /admin/finance/bonus-adjustments/:id/apply`
- `POST /admin/finance/bonus-ledger/:id/revoke`
