# DRIVER_KYC.md

## Flujo Sprint 2 (KYC-lite)
1. Usuario registrado como `passenger` solicita ser conductor (`POST /drivers/request`).
2. Se crea `DriverProfile` en `PENDING_DOCS`.
3. Usuario sube documentos con URL prefirmada (`POST /drivers/me/documents/presign`).
4. Admin/SOS inicia revisión (`POST /admin/drivers/:id/review-start`) => `IN_REVIEW`.
5. Admin/SOS aprueba o rechaza:
   - Approve: `APPROVED`, auditoría + grant role `driver` en auth.
   - Reject: `REJECTED` con motivo.
   - Suspend: `SUSPENDED`.

## Estados
- `PENDING_DOCS`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `SUSPENDED`

## Endpoints principales
- `POST /drivers/request`
- `GET /drivers/me`
- `POST /drivers/me/documents/presign`
- `POST /drivers/me/vehicle`
- `GET /admin/drivers/pending`
- `GET /admin/drivers/:id`
- `POST /admin/drivers/:id/review-start`
- `POST /admin/drivers/:id/approve`
- `POST /admin/drivers/:id/reject`
- `POST /admin/drivers/:id/suspend`

## UI admin
- `/admin/drivers`: tabla de pendientes.
- `/admin/drivers/[id]`: detalle + docs + eventos + acciones.
