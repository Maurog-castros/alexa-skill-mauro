#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"
DOCKER_GATEWAY_URL="http://127.0.0.1:18791"
OPENCLAW_MAURO="${OPENCLAW_MAURO:-/home/mauro/Dev/openclaw-mauro}"
OPENCLAW_CANONICAL="${OPENCLAW_CANONICAL:-/home/mauro/openclaw-mauro}"
OPENCLAW_HOME="${OPENCLAW_STATE_DIR:-$HOME/.openclaw}"

upsert_env() {
  local key="$1"
  local value="$2"
  touch "$ENV_FILE"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

docker_gateway_running() {
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'openclaw-openclaw-gateway-1'
}

setup_docker_mode() {
  echo "Modo Docker detectado (openclaw-openclaw-gateway-1)"
  upsert_env "OPENCLAW_GATEWAY_URL" "$DOCKER_GATEWAY_URL"
  upsert_env "OPENCLAW_AGENT_ID" "mauro"

  if [[ ! -L "$OPENCLAW_CANONICAL" ]] || [[ "$(readlink -f "$OPENCLAW_CANONICAL" 2>/dev/null)" != "$(readlink -f "$OPENCLAW_MAURO")" ]]; then
    echo "  AVISO: ejecuta $OPENCLAW_MAURO/scripts/fix-openclaw-mount-path.sh para restaurar el symlink canónico"
  fi

  if grep -q '"chatCompletions"' "$OPENCLAW_MAURO/data/config/openclaw.json" 2>/dev/null; then
    echo "  chatCompletions habilitado en openclaw.json"
  else
    echo "  AVISO: habilita gateway.http.endpoints.chatCompletions.enabled en openclaw.json"
  fi

  echo
  echo "Configura OPENCLAW_GATEWAY_TOKEN en $ENV_FILE con el token del Gateway Docker."
  echo "  docker exec openclaw-openclaw-gateway-1 openclaw config get gateway.auth.token"
}

setup_standalone_mode() {
  local token_file="$OPENCLAW_HOME/.gateway-token"
  local config_file="$OPENCLAW_HOME/openclaw.json"

  mkdir -p \
    "$OPENCLAW_HOME/agents/mauro/agent" \
    "$OPENCLAW_HOME/agents/mauro/sessions" \
    "$OPENCLAW_HOME/workspace-mauro"

  local token
  if [[ -f "$token_file" ]]; then
    token="$(cat "$token_file")"
  else
    token="$(openssl rand -hex 24)"
    echo "$token" > "$token_file"
    chmod 600 "$token_file"
  fi

  cp -r "$ROOT/openclaw/workspace-care/." "$OPENCLAW_HOME/workspace-mauro/"
  sed "s/__OPENCLAW_GATEWAY_TOKEN__/$token/" "$ROOT/openclaw/openclaw.mauro.json5" > "$config_file"

  upsert_env "OPENCLAW_GATEWAY_URL" "http://127.0.0.1:18789"
  upsert_env "OPENCLAW_GATEWAY_TOKEN" "$token"
  upsert_env "OPENCLAW_AGENT_ID" "mauro"

  echo "OpenClaw mauro configurado en $OPENCLAW_HOME"
  echo "  config: $config_file"
  echo "  token:  $token_file"
}

if docker_gateway_running; then
  setup_docker_mode
else
  echo "Gateway Docker no detectado; usando modo standalone en $OPENCLAW_HOME"
  setup_standalone_mode
fi

echo
echo "  .env: $ENV_FILE"
echo
echo "Prueba (con token configurado):"
echo "  curl -s -X POST \$OPENCLAW_GATEWAY_URL/v1/chat/completions \\"
echo "    -H \"Authorization: Bearer \$OPENCLAW_GATEWAY_TOKEN\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"model\":\"openclaw/mauro\",\"messages\":[{\"role\":\"user\",\"content\":\"Hola\"}]}'"
