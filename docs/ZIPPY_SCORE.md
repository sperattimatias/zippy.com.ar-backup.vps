# ZIPPY_SCORE.md

## Objetivo
Zippy Score aplica reglas de fairness + security para drivers y passengers con estado persistente y auditable.

## Thresholds
- 80..100 -> `NONE`
- 60..79 -> `WARNING`
- 40..59 -> `LIMITED`
- <40 -> `BLOCKED` (auto-restricción 24h)

## Deltas MVP
- `TRIP_COMPLETED_CLEAN`: driver `+2`, passenger `+1`
- `PASSENGER_CANCEL_LATE`: `-6`
- `DRIVER_CANCEL_LATE`: `-8`
- `ENTERED_RED_ZONE`: `-10` driver
- `ROUTE_DEVIATION_MAJOR`: `-15` driver
- `ROUTE_DEVIATION_MINOR`: `-5` driver
- `TRACKING_LOST_MAJOR`: `-10` driver
- `OTP_FAILED_MULTIPLE`: `-12` passenger (MVP)

## Efectos
- Matching prioriza drivers por score DESC.
- `BLOCKED` impide presence online.
- `LIMITED` permite online con flag `is_limited`.
