# RBAC.md

## Roles iniciales
- `passenger`: usuario final pasajero.
- `driver`: conductor.
- `admin`: operador interno.
- `sos`: operaciones críticas / emergencia.

## Permisos iniciales
- `admin` y `sos` pueden acceder a `/admin/*` en admin-panel.
- `admin` y `sos` habilitados en gateway para endpoint de ejemplo `GET /admin/ping`.
- `passenger` es rol por defecto al registrarse.

## Extensión recomendada
- Evolucionar a matriz de permisos por recurso/acción.
- Agregar políticas por tenant/región y auditoría de permisos efectivos.


## Auth admin operation
- `POST /auth/admin/grant-role` permite asignar rol `driver` a un `user_id`.
- Protegido para `admin|sos`.
