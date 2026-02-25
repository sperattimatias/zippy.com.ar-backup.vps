# Auditoría técnica del repositorio Zippy

## 1) Foto general

- Monorepo PNPM con `apps/*`, `services/*` y `shared/*`.
- Backend orientado a microservicios NestJS (API Gateway + Auth + Ride + Driver + Payment).
- Frontend web de administración en Next.js.
- App móvil Flutter Android MVP.
- Infra local/prod basada en Docker Compose + Traefik + Postgres + Redis + MinIO.

## 2) Lo que está muy bien resuelto

1. **Arquitectura modular y escalable**
   - Separación explícita por dominios de negocio (`auth`, `ride`, `driver`, `payment`) y gateway dedicado.
   - Compose con healthchecks y `depends_on` por estado de salud en servicios críticos.

2. **Dominio de negocio profundo**
   - El schema de `ride` cubre ciclo de viaje, seguridad, score, restricciones, meritocracia, bonuses, antifraude y holds.
   - El schema de `payment` incluye estados de pago, refunds y ledger inmutable con reversos.

3. **Controles de seguridad y operación**
   - JWT + guards/roles en gateway y servicios.
   - Hardening básico de headers HTTP y CORS configurable.
   - Validaciones de entorno/config (`validate-config`, `validate-production-env`) y workflows CI dedicados.

4. **Trazabilidad y auditoría**
   - Eventos explícitos en varios dominios (`TripEvent`, `DriverEvent`, `PaymentMvpEvent`, `RideLifecycleEvent`).
   - Estructuras para investigación antifraude (`FraudSignal`, `FraudCase`, `FraudCaseSignalLink`).

## 3) Riesgos / deuda técnica priorizada

### A. Riesgos críticos

1. **No hay pipeline de test automatizado en CI para unit/integration tests**
   - Existen specs, pero los workflows actuales sólo validan configuración, smoke compose y env productivo.
   - Impacto: riesgo de regresiones funcionales al crecer módulos.

2. **Dependencia fuerte en una base compartida entre servicios**
   - `payment` y `ride` modelan tablas externas con `@@map` (ej. `Trip`, `CommissionPolicy`, `MonthlyBonusLedger`, `UserHold`, `FraudSignal`).
   - Impacto: alto acoplamiento de esquemas y riesgo de drift entre bounded contexts.

3. **Exposición de seguridad en defaults de ejemplo**
   - `.env.example` incluye credenciales obvias para entorno local (`zippy/zippy`, `minio123`) y secreto JWT placeholder.
   - Impacto: si se reutiliza sin rotación en ambientes reales, riesgo grave.

### B. Riesgos altos

4. **Gateway muy cargado de reglas de rutas/proxy**
   - En `app.module.ts` hay gran concentración de route maps, guards y rewrites.
   - Impacto: difícil mantenimiento y mayor probabilidad de errores de autorización o rewrite.

5. **Modelo de negocio con gran complejidad en `ride`**
   - Muy potente, pero concentra múltiples responsabilidades (core de viaje + safety + scoring + antifraude + niveles).
   - Impacto: testing y evolución más costosa; riesgo de acoplamiento interno.

6. **Cobertura de observabilidad parcial**
   - Hay logger y health endpoints, pero no se ve estandarización visible de métricas/tracing distribuido en todo el stack.
   - Impacto: troubleshooting multi-servicio más lento.

### C. Riesgos medios

7. **Admin panel con guard de sesión correcto, pero con dependencia fuerte al BFF de auth en cookies**
   - Flujo robusto para refresh, aunque sensible a políticas de cookies y despliegues en dominios/subdominios.

8. **Falta de un “contract testing” formal entre gateway y servicios**
   - El gateway hace múltiples rewrites; sin contratos automatizados, las roturas de rutas son probables.

## 4) Estado de madurez (estimado)

- **Producto**: avanzado para MVP+ (incluye seguridad operacional, antifraude, finanzas, panel admin, móvil).
- **Ingeniería**: sólida en diseño de dominio; media en automatización de calidad continua.
- **Operación**: buena base con Compose/Traefik/healthchecks; falta reforzar observabilidad y validación automática de regresiones.

## 5) Recomendaciones concretas (orden sugerido)

1. **Semana 1–2: Quality gate mínimo obligatorio**
   - Agregar workflow CI de tests unitarios por servicio (`auth`, `ride`, `driver`, `payment`).
   - Incluir `build` de gateway/admin para detectar roturas de tipado/build.

2. **Semana 2–3: Contratos de API gateway**
   - Tests de contrato para rewrites críticos (`/api/auth/*`, `/api/trips/*`, `/api/admin/*`, `/api/payments/*`).
   - Tests de autorización por rol en rutas administrativas.

3. **Semana 3–4: Observabilidad transversal**
   - Definir `request_id` end-to-end, logging estructurado homogéneo, y métricas básicas (latencia/error-rate por servicio).

4. **Mes 2: Reducción de acoplamiento inter-servicios en DB**
   - Documentar explícitamente tablas “externas” y ownership.
   - Evaluar eventos internos o vistas/materializaciones para desacoplar `ride` vs `payment`.

5. **Mes 2: Hardening de secretos y entornos**
   - Checklist formal de despliegue seguro y rotación de secretos.
   - Política para impedir uso de defaults inseguros fuera de desarrollo.

## 6) Veredicto ejecutivo

**Tu repo está fuerte en producto y diseño de dominio**: se nota visión de plataforma real, no demo. El mayor gap no es funcional, sino de **aseguramiento de calidad automatizada y desacoplamiento técnico** para escalar con menos riesgo.

Si reforzás CI de tests + contratos gateway + observabilidad, el proyecto puede pasar de “MVP avanzado” a “base de producción muy sólida” rápidamente.
