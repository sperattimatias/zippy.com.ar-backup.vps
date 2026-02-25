# SECURITY_NOTES.md

## MinIO document security
- Los documentos nunca son públicos.
- El backend genera URLs prefirmadas temporales:
  - PUT para carga (`presignedPutObject`)
  - GET para revisión (`presignedGetObject`)
- Credenciales MinIO viven solo en backend (`services/driver`), nunca en frontend.

## Auth / tokens
- `refresh_token` en cookie `httpOnly`.
- `access_token` también en cookie `httpOnly` (BFF) para eliminar `localStorage`.
- `/api/auth/me` en admin-panel reintenta con refresh si access expiró.

## Identity trust model
- **Nunca confiar en headers personalizados** (por ejemplo `x-user-id`) para identidad/autorización.
- En `services/driver`, la identidad del actor proviene exclusivamente de JWT Bearer validado por `JwtAccessGuard`.
- Los permisos de administración se aplican con `RolesGuard` + `@Roles('admin', 'sos')`.
- Sin token válido (o con rol insuficiente), el acceso a endpoints protegidos debe fallar con `401/403`.

## Auditoría
- `DriverEvent` es log inmutable de acciones clave (`APPROVED`, `REJECTED`, etc.).
- Se registra `actor_user_id`, tipo y payload.
