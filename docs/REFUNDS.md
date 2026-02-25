# Refunds (Sprint 10.1)

## Deterministic rounding
For partial refunds:
1. `commission_reversal = floor(refund_amount * commission_amount / amount_total)`
2. `driver_reversal = refund_amount - commission_reversal`
3. Always enforce `commission_reversal + driver_reversal == refund_amount`.

Never round both branches independently.

## Payment status/settlement coherence
- Full refund (`refunded_amount == amount_total`):
  - `status = REFUNDED`
  - `is_fully_refunded = true`
  - `refunded_at` set
  - `settlement_status = FAILED`
- Partial refund:
  - `status = APPROVED`
  - `is_fully_refunded = false`
  - settlement keeps previous flow (`SETTLED` or `NOT_SETTLED` under hold)

## Endpoints
- `POST /admin/payments/:trip_payment_id/refund`
- `GET /admin/finance/refunds`
