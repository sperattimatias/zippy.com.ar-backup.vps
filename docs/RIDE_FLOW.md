# RIDE_FLOW.md

## Flujo end-to-end
`request → bidding → match → driver en camino → arrived → OTP → in_progress → completed → rated`

### Estados
- `REQUESTED` / `BIDDING`
- `MATCHED`
- `DRIVER_EN_ROUTE`
- `ARRIVED` / `OTP_PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- cancelados: `CANCELLED_BY_PASSENGER`, `CANCELLED_BY_DRIVER`, `EXPIRED_NO_DRIVER`

### Realtime (Socket.IO namespace `/rides`)
Rooms:
- `trip:{tripId}` passenger + driver
- `driver:{driverUserId}` ofertas personalizadas

Eventos emitidos:
- `trip.created`
- `trip.bidding.started`
- `trip.bid.received`
- `trip.matched`
- `trip.driver.en_route`
- `trip.arrived`
- `trip.otp.generated` (solo passenger)
- `trip.started`
- `trip.location.update`
- `trip.completed`
- `trip.cancelled`

### WS auth
- Handshake con Bearer JWT.
- Token validado con `JWT_ACCESS_SECRET`.
- Claims guardados en `socket.data.user`.

### Ejemplo cliente Socket.IO
```ts
import { io } from 'socket.io-client';

const socket = io('https://ride.zippy.local/rides', {
  extraHeaders: { Authorization: `Bearer ${accessToken}` },
});

socket.on('trip.bidding.started', (payload) => console.log(payload));
socket.on('trip.location.update', (payload) => console.log(payload));
```
