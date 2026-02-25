#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="infra/docker-compose.yml"
ENV_FILE=".env.example"
SERVICES=(postgres redis minio auth ride driver payment api-gateway admin-panel)
HEALTH_SERVICES=(auth ride driver payment api-gateway admin-panel)

cleanup() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans || true
}
trap cleanup EXIT

echo "[compose-smoke] Bringing up services: ${SERVICES[*]}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build "${SERVICES[@]}"

echo "[compose-smoke] Waiting for health checks"
for svc in "${HEALTH_SERVICES[@]}"; do
  cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q "$svc")"
  if [[ -z "$cid" ]]; then
    echo "❌ Service $svc has no running container"
    exit 1
  fi

  ok="false"
  for _ in $(seq 1 60); do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$cid")"
    if [[ "$status" == "healthy" ]]; then
      ok="true"
      break
    fi
    if [[ "$status" == "unhealthy" ]]; then
      echo "❌ Service $svc is unhealthy"
      docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs "$svc" || true
      exit 1
    fi
    sleep 5
  done

  if [[ "$ok" != "true" ]]; then
    echo "❌ Timeout waiting for service $svc to become healthy"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs "$svc" || true
    exit 1
  fi

  echo "✅ $svc is healthy"
done

echo "[compose-smoke] All health-checked services are healthy"
