#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="infra/docker-compose.yml"
ENV_FILE=".env.example"
INFRA_SERVICES=(postgres redis minio)
APP_SERVICES=(auth ride driver payment api-gateway admin-panel)
HEALTH_SERVICES=(auth ride driver payment api-gateway admin-panel)

cleanup() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v --remove-orphans || true
}
trap cleanup EXIT

echo "[compose-smoke] Bringing up infra services: ${INFRA_SERVICES[*]}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build "${INFRA_SERVICES[@]}"

echo "[compose-smoke] Waiting for postgres to be healthy"
postgres_cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q postgres)"
if [[ -z "$postgres_cid" ]]; then
  echo "❌ postgres container not found"
  exit 1
fi

for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$postgres_cid")"
  if [[ "$status" == "healthy" ]]; then
    echo "✅ postgres is healthy"
    break
  fi
  if [[ "$status" == "unhealthy" ]]; then
    echo "❌ postgres is unhealthy"
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs postgres || true
    exit 1
  fi
  sleep 2
 done

if [[ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$postgres_cid")" != "healthy" ]]; then
  echo "❌ Timeout waiting for postgres to be healthy"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs postgres || true
  exit 1
fi

echo "[compose-smoke] Bringing up app services: ${APP_SERVICES[*]}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build "${APP_SERVICES[@]}"

echo "[compose-smoke] Waiting for app service health checks"
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
