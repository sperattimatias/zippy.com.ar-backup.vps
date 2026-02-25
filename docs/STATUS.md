# Runtime Dependency Status (apps + services + traefik)

Scope analyzed:
- `apps/admin-panel`
- `apps/api-gateway`
- `services/auth`
- `services/ride`
- `services/driver`
- `services/payment`
- `infra/traefik`

Sources used:
- runtime env validation (`Joi` / `zod`), direct `process.env` usage, Docker Compose wiring, Dockerfiles, and controllers for health routes.

---

## 1) Runtime map by runnable component

## apps/admin-panel

- **Exposed port**
  - Container: `3005` (`EXPOSE 3005`, `next start -p 3005`).
  - Public via Traefik: `https://admin.${TRAEFIK_DOMAIN}`.

- **Required env vars**
  - From validation (`next.config.mjs`):
    - `NODE_ENV` (default)
    - `ADMIN_PANEL_PORT` (default `3005`)
    - `NEXT_PUBLIC_API_GATEWAY_URL` (**required** URL)
    - `API_GATEWAY_INTERNAL_URL` (optional URL)
  - From code usage:
    - Uses `API_GATEWAY_INTERNAL_URL ?? NEXT_PUBLIC_API_GATEWAY_URL` in all server route handlers.
  - From compose:
    - `NODE_ENV`, `ADMIN_PANEL_PORT=3005`, `NEXT_PUBLIC_API_GATEWAY_URL=https://api.${TRAEFIK_DOMAIN}`, `API_GATEWAY_INTERNAL_URL=http://api-gateway:3000`.

- **Upstream dependencies**
  - `api-gateway` (internal service URL).
  - No direct postgres/redis/minio usage.

- **Base URLs used**
  - Internal: `http://api-gateway:3000`.
  - Public/browser: `https://api.${TRAEFIK_DOMAIN}`.

- **Health endpoint**
  - `GET /api/health`.

---

## apps/api-gateway

- **Exposed port**
  - Container: `3000`.
  - Public via Traefik: `https://api.${TRAEFIK_DOMAIN}`.

- **Required env vars**
  - From Joi:
    - `NODE_ENV` (default)
    - `LOG_LEVEL` (default)
    - `CORS_ORIGIN` (default)
    - `API_GATEWAY_PORT` (default `3000`)
    - `AUTH_SERVICE_URL` (**required** URL)
    - `RIDE_SERVICE_URL` (**required** URL)
    - `DRIVER_SERVICE_URL` (**required** URL)
    - `PAYMENT_SERVICE_URL` (**required** URL)
    - `JWT_ACCESS_SECRET` (**required**, min 32)
  - From compose:
    - `API_GATEWAY_PORT=3000`
    - `AUTH_SERVICE_URL=http://auth:3001`
    - `RIDE_SERVICE_URL=http://ride:3002`
    - `DRIVER_SERVICE_URL=http://driver:3003`
    - `PAYMENT_SERVICE_URL=http://payment:3004`
    - `JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}`

- **Upstream dependencies**
  - `auth`, `ride`, `driver`, `payment` (reverse proxy targets).

- **Base URLs used**
  - Internal targets:
    - `AUTH_SERVICE_URL` (`/api/auth/*` -> `/auth/*`)
    - `RIDE_SERVICE_URL` (trips/admin/public badge/commission and many admin route rewrites)
    - `DRIVER_SERVICE_URL` (driver routes + `/api/admin/drivers/*` rewrite)
    - `PAYMENT_SERVICE_URL` (`/api/payments/*`)
  - Public entrypoint:
    - `https://api.${TRAEFIK_DOMAIN}`.

- **Health endpoints**
  - `GET /health`
  - `GET /health/live`
  - `GET /health/ready`

---

## services/auth

- **Exposed port**
  - Container: `3001`.
  - Public via Traefik: `https://auth.${TRAEFIK_DOMAIN}`.

- **Required env vars**
  - From Joi:
    - `NODE_ENV` (default)
    - `LOG_LEVEL` (default)
    - `CORS_ORIGIN` (default)
    - `AUTH_SERVICE_PORT` (default `3001`)
    - `DATABASE_URL` (**required**)
    - `REDIS_URL` (**required** URI)
    - `JWT_ACCESS_SECRET` (**required**, min 32)
    - `JWT_ACCESS_EXPIRES_IN` (default `15m`)
    - `REFRESH_TOKEN_EXPIRES_DAYS` (default `30`)
    - `EMAIL_VERIFICATION_TTL_MIN` (default `10`)
  - From code usage:
    - `AUTH_ADMIN_PASSWORD` only used by Prisma seed script fallback.
  - From compose:
    - all Joi keys above are wired except `CORS_ORIGIN` (optional due default).

- **Upstream dependencies**
  - postgres (`DATABASE_URL`)
  - redis (`REDIS_URL`)

- **Base URLs used**
  - None for outbound HTTP calls found in runtime app path.
  - Public host exposed by Traefik: `https://auth.${TRAEFIK_DOMAIN}`.

- **Health endpoints**
  - `GET /health`
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /auth/health`

---

## services/ride

- **Exposed port**
  - Container: `3002`.
  - Public via Traefik: `https://ride.${TRAEFIK_DOMAIN}`.

- **Required env vars**
  - From Joi:
    - `NODE_ENV` (default)
    - `LOG_LEVEL` (default)
    - `CORS_ORIGIN` (default)
    - `RIDE_SERVICE_PORT` (default `3002`)
    - `DATABASE_URL` (**required**)
    - `REDIS_URL` (**required** URI)
    - `JWT_ACCESS_SECRET` (**required**, min 32)
  - From compose:
    - all required keys are wired.

- **Upstream dependencies**
  - postgres (`DATABASE_URL`)
  - redis (`REDIS_URL`)

- **Base URLs used**
  - No outbound base URL env var in ride app module.
  - Exposes internal endpoints consumed by payment:
    - `GET /internal/commission/driver/:driverUserId`
    - `POST /internal/payments/paid`
  - Public host via Traefik: `https://ride.${TRAEFIK_DOMAIN}`.

- **Health endpoints**
  - `GET /health`
  - `GET /health/live`
  - `GET /health/ready`

---

## services/driver

- **Exposed port**
  - Container: `3003`.
  - Public via Traefik: `https://driver.${TRAEFIK_DOMAIN}`.

- **Required env vars**
  - From Joi:
    - `NODE_ENV` (default)
    - `LOG_LEVEL` (default)
    - `CORS_ORIGIN` (default)
    - `DRIVER_SERVICE_PORT` (default `3003`)
    - `DATABASE_URL` (**required**)
    - `REDIS_URL` (**required** URI)
    - `MINIO_ENDPOINT` (**required**)
    - `MINIO_PORT` (default `9000`)
    - `MINIO_ROOT_USER` (**required**)
    - `MINIO_ROOT_PASSWORD` (**required**)
    - `MINIO_BUCKET` (default `zippy-private`)
    - `AUTH_SERVICE_URL` (**required** URI)
    - `JWT_ACCESS_SECRET` (**required**, min 32)
  - From compose:
    - `JWT_ACCESS_SECRET` is **missing** for driver service.
    - `AUTH_SERVICE_URL` is set to `http://api-gateway:3000` (name suggests auth, but value points to gateway).

- **Upstream dependencies**
  - postgres (`DATABASE_URL`)
  - redis (`REDIS_URL`)
  - minio (`MINIO_*`)
  - HTTP upstream for role grant: `${AUTH_SERVICE_URL}/api/auth/admin/grant-role`

- **Base URLs used**
  - Internal: `AUTH_SERVICE_URL` (currently gateway URL in compose).
  - Public host via Traefik: `https://driver.${TRAEFIK_DOMAIN}`.

- **Health endpoints**
  - `GET /health`
  - `GET /health/live`
  - `GET /health/ready`

---

## services/payment

- **Exposed port**
  - Container: `3004`.
  - Public via Traefik: `https://payment.${TRAEFIK_DOMAIN}`.

- **Required env vars**
  - From Joi:
    - `NODE_ENV` (default)
    - `LOG_LEVEL` (default)
    - `CORS_ORIGIN` (default)
    - `PAYMENT_SERVICE_PORT` (default `3004`)
    - `DATABASE_URL` (**required**)
    - `REDIS_URL` (**required** URI)
    - `JWT_ACCESS_SECRET` (**required**, min 32)
    - `MP_WEBHOOK_SECRET` (optional)
    - `RIDE_SERVICE_URL` (optional URI)
  - From code usage (`process.env` / runtime access):
    - `MP_ACCESS_TOKEN` (required for MP preference flow but not Joi-validated)
    - `MP_WEBHOOK_SECRET` (used for webhook signature check)
    - `RIDE_SERVICE_URL` (used for commission and payment-paid callbacks)
  - From compose:
    - `JWT_ACCESS_SECRET` is **missing** for payment service.
    - `RIDE_SERVICE_URL=http://ride:3002` is wired.

- **Upstream dependencies**
  - postgres (`DATABASE_URL`)
  - redis (`REDIS_URL`)
  - ride service via `RIDE_SERVICE_URL` (internal commission + payment paid callback)
  - external MercadoPago API (requires `MP_ACCESS_TOKEN` in code path)

- **Base URLs used**
  - Internal: `RIDE_SERVICE_URL` (docker network).
  - External: `https://api.mercadopago.com` (hardcoded in service).
  - Public host via Traefik: `https://payment.${TRAEFIK_DOMAIN}`.

- **Health endpoints**
  - `GET /health`
  - `GET /health/live`
  - `GET /health/ready`

---

## infra/traefik

- **Exposed port**
  - Host:
    - `80:80`
    - `443:443`
    - `127.0.0.1:8080:8080` (dashboard)

- **Required env vars**
  - `ACME_EMAIL`
  - `CF_DNS_API_TOKEN`
  - `TRAEFIK_DOMAIN` (used in labels across app/service routers)

- **Upstream dependencies**
  - Docker provider (`/var/run/docker.sock`)
  - file provider (`infra/traefik/dynamic.yml`)
  - routes to all app/service containers by label.

- **Base URLs used**
  - Public ingress hostnames:
    - `api.${TRAEFIK_DOMAIN}`
    - `auth.${TRAEFIK_DOMAIN}`
    - `ride.${TRAEFIK_DOMAIN}`
    - `driver.${TRAEFIK_DOMAIN}`
    - `payment.${TRAEFIK_DOMAIN}`
    - `admin.${TRAEFIK_DOMAIN}`

- **Health endpoints**
  - No explicit Traefik `/ping` configured in compose command.
  - Dashboard is enabled on port `8080` loopback binding.

---

## 2) Concise Gap List (what currently blocks or risks E2E)

1. **Compose missing mandatory secrets for two services**
   - `driver` is missing `JWT_ACCESS_SECRET` even though Joi requires it.
   - `payment` is missing `JWT_ACCESS_SECRET` even though Joi requires it.
   - Impact: both services can fail to boot at config validation stage.

2. **No `.env.example` present in repo root**
   - `README.md` instructs `cp .env.example .env`, but `.env.example` is absent.
   - Impact: bootstrap friction and missing canonical env contract.

3. **Payment code depends on `MP_ACCESS_TOKEN` but config validation does not enforce it**
   - Preference creation path reads `process.env.MP_ACCESS_TOKEN` directly.
   - Compose also does not provide it.
   - Impact: payment flow may fail at runtime even when service starts.

4. **`AUTH_SERVICE_URL` naming ambiguity in `driver` service**
   - Driver uses `${AUTH_SERVICE_URL}/api/auth/admin/grant-role`.
   - Compose points it to gateway (`http://api-gateway:3000`), not auth service (`http://auth:3001`).
   - This works only because the driver code calls gateway-style `/api/auth/...`; variable name is misleading and easy to misconfigure.

5. **Admin panel port env is not truly runtime-configurable**
   - `ADMIN_PANEL_PORT` is validated and set in compose, but start script hardcodes `next start -p 3005`.
   - Impact: env suggests configurability that does not exist.

6. **Seeds not wired in compose startup chain**
   - Compose runs `prisma migrate deploy` for backend services, but no `prisma db seed` execution.
   - Auth has a seed script (`prisma/seed.ts`) including default admin password fallback, but it is not invoked.
   - Impact: missing baseline data (e.g., admin/bootstrap entities) can break E2E admin/login workflows depending on expected seeded state.

7. **Potential route semantics mismatch risk (`/api/rides` rewrite)**
   - Gateway rewrites `/api/rides/*` to `/` on ride service.
   - Ride controller exposes main endpoints under `/ride/*` and `/trips/*`.
   - If clients call `/api/rides/...`, rewritten path may not match expected ride controller routes.
   - Current README centers on `/api/trips/*`; still a consistency hazard.

8. **No explicit Traefik health probe configured**
   - Traefik has no service-level healthcheck or `--ping` endpoint in compose.
   - Impact: infra readiness can be less observable in automated E2E bring-up.

---

## 3) Quick E2E readiness summary

- **Likely hard blockers**: missing `JWT_ACCESS_SECRET` in `driver` and `payment`; missing payment provider token (`MP_ACCESS_TOKEN`) for payment preference flow.
- **Operational blockers**: missing `.env.example`, no seed automation.
- **Consistency risks**: ambiguous `AUTH_SERVICE_URL` naming in driver and `/api/rides` rewrite behavior in gateway.
