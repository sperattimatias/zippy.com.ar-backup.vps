# Zippy Flutter Android MVP

Aplicación Android Flutter para Passenger + Driver con realtime Socket.IO y mapas.

## Setup
1. Instalar Flutter 3.22+.
2. Ir a la carpeta:
   ```bash
   cd apps/mobile/zippy_app
   ```
3. Instalar dependencias:
   ```bash
   flutter pub get
   ```
4. Ejecutar en Android:
   ```bash
   flutter run --dart-define=API_BASE_URL=https://api.zippy.com.ar --dart-define=SOCKET_BASE_URL=https://api.zippy.com.ar
   ```

## Flows implementados
- Auth: splash, login, registro pasajero.
- Role switch: pasajero/conductor.
- Passenger: home map, destino, waiting bids, in-trip.
- Driver: home online/offline, incoming requests, en route, OTP, earnings.
- Realtime base: Socket service con join rooms y listeners.

## End-to-end manual
1. Login con cuenta passenger y pedir viaje.
2. Abrir sesión driver y poner Online.
3. Enviar oferta, aceptar desde passenger.
4. Driver marca llegado + OTP + iniciar/finalizar viaje.

## UX Guide (Sprint 11.1)
- Home pasajero full-map con barra flotante de búsqueda.
- Request flow en 2 pasos visibles: Home -> Sheet -> Solicitar.
- Bottom sheets consistentes con handle + radius 24.
- Estados vacíos con CTA (sin conductores, sin ofertas, cuenta en revisión).
- Chips de estado de viaje animados.

### Screenshots esperados (QA)
1. Passenger Home con search bar flotante y action card.
2. Destination Sheet completo (destino + slider oferta + CTA).
3. Waiting screen con skeleton/empty y luego oferta.
4. Driver Home con toggle grande + badges.
5. Driver incoming request card con timer circular.

### Screenshots (Black Edition)
> En este entorno no se pudieron generar capturas automáticas porque no hay runtime Flutter/web activo para renderizar la app.
> QA debe adjuntar estas capturas al validar en dispositivo/emulador Android:
- Passenger Home Black (mapa + search bar flotante)
- Destination Sheet Black (destino + slider + CTA)
- Driver Home Black (earnings + toggle online)
