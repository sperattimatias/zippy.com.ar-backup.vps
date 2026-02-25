# Financial Anti-Fraud (Sprint 9)

## Core entities
- `ClientFingerprint`: stores only SHA-256 hashes (ip, user-agent, optional device fingerprint)
- `FraudSignal`: atomic suspicious event with severity and risk delta
- `FraudCase`: review container for grouped signals
- `FinancialRiskScore`: 0..100 risk score
- `UserHold`: temporary controls (feature, payout, account)

## Signals (MVP)
- repeated pair trips
- suspicious low-distance repeated patterns
- shared IP over threshold (24h)
- shared device fingerprint over threshold (24h)

## Automatic actions
- HIGH risk: `FEATURE_LIMIT` hold (48h)
- CRITICAL risk: `PAYOUT_HOLD`

## Realtime
- `admin.fraud.case.created`
- `user.hold.applied`
- `user.hold.released`


## Hardening 9.1
- Signal dedupe window configurable (`signal_dedupe_window_minutes`): repeated triggers update `occurrences` instead of creating spam rows.
- Repeated-pair now uses pattern analysis (low-distance ratio + origin/destination clustering + tight amount) before assigning HIGH severity.
- Shared-IP capped by config (`shared_ip_severity_max`, default LOW) unless combined with shared-device evidence.
- LOW cases auto-close after configurable inactivity window (`low_case_autoclose_days`).
- Risk decay reduces score by `risk_decay_points_per_30d` when no new signals exist in last 30d.
- FraudCase dedupe attaches new signals to open/in-review case for same user (and pair key for repeated-pair).
