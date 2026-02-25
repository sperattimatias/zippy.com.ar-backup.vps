# MATCHING_WEIGHTS.md

Matching score usa pesos configurables (`matching_weights`):
- `w_score`
- `w_distance`
- `w_reliability`
- `w_status`
- `w_peak`
- `w_zone`

Default:
```json
{
  "w_score": 0.45,
  "w_distance": 0.35,
  "w_reliability": 0.15,
  "w_status": 0.05,
  "w_peak": 0.10,
  "w_zone": 0.10,
  "top_n": 15,
  "expand_to": 30,
  "expand_after_s": 15
}
```
