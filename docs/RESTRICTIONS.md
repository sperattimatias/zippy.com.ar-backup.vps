# RESTRICTIONS.md

## Auto vs Manual
- **Auto**: al caer por debajo de score 40 se crea `UserRestriction` `BLOCKED` con razón `LOW_SCORE_AUTO` por 24h.
- **Manual**: Admin/SOS puede crear restricciones (`BLOCKED`/`LIMITED`) y levantarlas antes de tiempo.

## Flujo de revisión
1. Revisar `/admin/scores`.
2. Abrir detalle `/admin/scores/[user_id]?actor_type=`.
3. Aplicar bloqueo manual o ajuste de score.
4. Levantar restricción cuando corresponde.

Cada acción manual registra `ScoreEvent` tipo `MANUAL_ADJUST` para auditoría.
