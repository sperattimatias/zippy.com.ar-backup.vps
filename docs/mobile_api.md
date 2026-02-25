# Mobile API Contract (Gateway)

## Auth
- `POST /auth/login`
- `POST /auth/register`
- `GET /me`

## Driver
- `POST /drivers/presence/online`
- `POST /drivers/presence/offline`
- `GET /drivers/commission/current`
- `GET /drivers/finance/trips`

## Passenger
- `POST /trips/request`
- `POST /trips/:id/cancel`
- `GET /trips/history`

## Ride Flow
- `POST /trips/:id/bids` (driver)
- `POST /trips/:id/bids/:bidId/accept` (passenger)
- `POST /trips/:id/driver/arrived`
- `POST /trips/:id/driver/verify-otp`
- `POST /trips/:id/complete`

## Realtime events consumed
- `ride.request.created`
- `ride.bid.created`
- `ride.bid.accepted`
- `trip.status.updated`
- `driver.location.updated`
- `safety.alert`
- `safety.checkin_required`
- `user.restriction.updated`
- `user.badge.updated`
- `user.level.updated`
