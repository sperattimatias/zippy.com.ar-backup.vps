# Monthly Performance Financial Hardening (Sprint 10.1)

- Fully refunded trips are excluded from completed-count contribution.
- Partial refunds do not remove completed count.
- Filtering uses `TripPayment.refunded_amount` against `amount_total` to identify full reversals.

This keeps KPI behavior consistent with financial reversals and avoids rewarding fully reversed rides.
