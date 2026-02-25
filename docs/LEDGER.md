# Ledger

`LedgerEntry` is append-only and auditable.

## Entry types
- `TRIP_REVENUE`
- `PLATFORM_COMMISSION`
- `DRIVER_EARNING`
- `BONUS_DISCOUNT`
- `REFUND`

## Idempotency
- Approved webhook path checks for existing driver earning entry per trip before inserting new entries.
- Replayed webhooks do not duplicate financial entries.
- `REFUND_REVERSAL`
- `COMMISSION_REVERSAL`
- `DRIVER_NET_REVERSAL`

## Refund reversals
- Refunds are represented as compensating negative entries.
- Reversals are proportional for partial refunds, preserving accounting integrity.
