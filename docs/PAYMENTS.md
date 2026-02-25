# Payments (Sprint 8)

## Endpoints
- `POST /payments/create-preference` (passenger)
- `POST /payments/webhook` (MercadoPago)
- `GET /drivers/finance/summary`
- `GET /drivers/finance/trips`
- `GET /admin/finance/trips`
- `GET /admin/finance/ledger`
- `GET /admin/finance/reconciliation?date=YYYY-MM-DD`

## Flow
1. Passenger creates preference from a completed trip.
2. Service freezes `commission_bps_applied` using active monthly bonus + floor.
3. Webhook validates signature and updates status.
4. On approval, settlement + ledger entries are persisted idempotently.

## Refunds & Reversals (Sprint 10)
- `POST /admin/payments/:trip_payment_id/refund`
- `GET /admin/finance/refunds`
- Refunds can be partial or total and are idempotent by key + MP refund id.
- Each approved refund creates compensating ledger entries (`REFUND_REVERSAL`, `COMMISSION_REVERSAL`, `DRIVER_NET_REVERSAL`).
- `TripPayment.refunded_amount` accumulates; when equals `amount_total`, status moves to `REFUNDED`.
