# Commission

Comisión efectiva = `max(default_commission_bps - discount_bps, commission_floor_bps)`.

## Endpoint driver
- `GET /drivers/commission/current`

Response:
```json
{ "default_bps": 1000, "discount_bps": 300, "effective_bps": 700, "bonus_valid_until": "..." }
```
