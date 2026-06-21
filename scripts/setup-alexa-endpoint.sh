#!/usr/bin/env bash
# Publica alexa.maurocastro.cl usando la infra DMZ existente (maurocastro-dmz).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DMZ="${MAUROCASTRO_DMZ:-$HOME/Dev/infra/maurocastro-dmz}"
ENV_FILE="$ROOT/.env"

load_env_token() {
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$ENV_FILE"
    set +a
  fi
}

load_env_token

TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "Generando token Alexa..."
  TOKEN="$(openssl rand -hex 24)"
  touch "$ENV_FILE"
  if grep -q '^OPENCLAW_GATEWAY_TOKEN=' "$ENV_FILE"; then
    sed -i "s|^OPENCLAW_GATEWAY_TOKEN=.*|OPENCLAW_GATEWAY_TOKEN=${TOKEN}|" "$ENV_FILE"
  else
    echo "OPENCLAW_GATEWAY_TOKEN=${TOKEN}" >> "$ENV_FILE"
  fi
  if grep -q '^OPENCLAW_GATEWAY_URL=' "$ENV_FILE"; then
    sed -i 's|^OPENCLAW_GATEWAY_URL=.*|OPENCLAW_GATEWAY_URL=https://alexa.maurocastro.cl|' "$ENV_FILE"
  else
    echo "OPENCLAW_GATEWAY_URL=https://alexa.maurocastro.cl" >> "$ENV_FILE"
  fi
  if ! grep -q '^OPENCLAW_AGENT_ID=' "$ENV_FILE"; then
    echo "OPENCLAW_AGENT_ID=mauro" >> "$ENV_FILE"
  fi
  echo "Token guardado en $ENV_FILE"
fi

echo "==> 1/4 DNS: registrar alexa.maurocastro.cl (cPanel UAPI)"
if [[ -d "$DMZ" ]]; then
  (cd "$DMZ" && python3 ddns_daemon.py --once --force -v) || {
    echo "AVISO: DDNS falló. Crea el registro A 'alexa' manualmente en cPanel." >&2
  }
else
  echo "AVISO: no existe $DMZ — salta DNS automático" >&2
fi

echo "==> 2/4 nginx: snippet Bearer"
PROXY="$DMZ/proxy"
if [[ -x "$PROXY/scripts/generate-alexa-auth-snippet.sh" ]]; then
  ALEXA_GATEWAY_TOKEN="$TOKEN" "$PROXY/scripts/generate-alexa-auth-snippet.sh"
else
  echo "AVISO: falta $PROXY/scripts/generate-alexa-auth-snippet.sh" >&2
fi

echo "==> 3/4 TLS: ampliar certificado"
if [[ -f "$PROXY/certbot/conf/live/maurocastro-dmz/fullchain.pem" ]]; then
  if [[ -x "$PROXY/scripts/expand-cert-alexa.sh" ]]; then
    "$PROXY/scripts/expand-cert-alexa.sh"
  else
    echo "AVISO: ejecuta manualmente expand-cert-alexa.sh" >&2
  fi
else
  echo "AVISO: sin certificado previo — ejecuta init-letsencrypt.sh en $PROXY" >&2
fi

echo "==> 4/4 Recargar proxy DMZ"
if [[ -f "$PROXY/docker-compose.yml" ]]; then
  (cd "$PROXY" && docker compose up -d && docker compose exec dmz-proxy nginx -t && docker compose exec dmz-proxy nginx -s reload)
fi

echo
echo "Listo. Prueba:"
echo "  curl -sS -X POST https://alexa.maurocastro.cl/v1/chat/completions \\"
echo "    -H \"Authorization: Bearer \$OPENCLAW_GATEWAY_TOKEN\" \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"model\":\"openclaw/mauro\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"stream\":false}'"
echo
echo "Deploy Lambda:"
echo "  sam deploy --parameter-overrides OpenClawGatewayUrl=https://alexa.maurocastro.cl OpenClawGatewayToken=<token> ..."
echo
echo "Documentación: $DMZ/docs/ALEXA-ENDPOINT.md"
