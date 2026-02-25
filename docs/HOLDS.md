# Holds

`UserHold` states:
- ACTIVE
- RELEASED
- EXPIRED

Types:
- `PAYOUT_HOLD`
- `FEATURE_LIMIT`
- `ACCOUNT_BLOCK`

## Payment settlement integration
When payment is approved and driver has ACTIVE `PAYOUT_HOLD`, payment remains `NOT_SETTLED` and ledger entries are persisted with `payload_json.held = true` for traceability.

## Admin/SOS endpoints
- `POST /admin/fraud/holds/create`
- `POST /admin/fraud/holds/:id/release`
