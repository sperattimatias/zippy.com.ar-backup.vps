# AUTH.md

## Diseño
- Autoridad central: `services/auth`.
- Firma de access tokens: **JWT HS256** usando `JWT_ACCESS_SECRET`.
- `access_token`: 15m (`JWT_ACCESS_EXPIRES_IN`).
- `refresh_token`: 30d (`REFRESH_TOKEN_EXPIRES_DAYS`) con **rotación obligatoria** y revocación.
- Password hashing: **Argon2id**.
- Códigos de verificación y refresh tokens guardados solo como hash (SHA-256).

## Flujo
1. `POST /auth/register` crea usuario `ACTIVE`, rol `passenger`, y código de verificación hasheado.
2. `POST /auth/verify-email` valida hash + expiración + intentos y marca `email_verified_at`.
3. `POST /auth/login` requiere email verificado y retorna `access_token + refresh_token`.
4. `POST /auth/refresh` revoca token viejo (`revoked_at`) y crea nuevo token (`replaced_by_token_id`).
5. `POST /auth/logout` revoca token actual o todos (`all=true`).
6. `GET /auth/me` requiere Bearer token y retorna usuario + roles.

## Seguridad
- Nunca se persisten secretos en texto plano.
- Logs no imprimen access/refresh tokens.
- Código de verificación solo se imprime en desarrollo.
- Rate limiting aplicado en register/login/verify-email con `@nestjs/throttler`.

## Modelo de sesión admin-panel (MVP)
- `refresh_token` en cookie httpOnly (`zippy_refresh_token`) via Next API route.
- `access_token` en cookie httpOnly manejada por BFF del admin-panel.
- Se evita `localStorage` para tokens en Sprint 2; mantener protección CSRF al evolucionar formularios sensibles.
