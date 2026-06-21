# Exponer OpenClaw para Alexa — `alexa.maurocastro.cl`

La infraestructura pública vive en **`~/Dev/infra/maurocastro-dmz`** (mismo patrón que `openclaw.maurocastro.cl`).

**DNS:** zglobalhost / cPanel UAPI (`powercp1.zglobalhost.com:2083`) vía `ddns_daemon.py`.

Guía completa: `~/Dev/infra/maurocastro-dmz/docs/ALEXA-ENDPOINT.md`

## Inicio rápido

```bash
chmod +x scripts/setup-alexa-endpoint.sh
./scripts/setup-alexa-endpoint.sh
```

Eso hace:

1. Registro A `alexa.maurocastro.cl` (cPanel UAPI)
2. Snippet nginx con Bearer token (desde `.env`)
3. Ampliación certificado Let's Encrypt
4. Reload del proxy DMZ

## Qué expone el vhost

| Ruta | Comportamiento |
|------|----------------|
| `POST /v1/chat/completions` | Proxy → OpenClaw `:18789` (Bearer + rate limit 30/min) |
| Todo lo demás | `404` |

El nginx DMZ valida `Authorization: Bearer <token>` y reenvía con `X-Forwarded-User: mauro-lan` para el modo `trusted-proxy` de OpenClaw.

## Variables Lambda / SAM

```bash
OpenClawGatewayUrl=https://alexa.maurocastro.cl
OpenClawGatewayToken=<mismo token que generate-alexa-auth-snippet.sh>
OpenClawAgentId=mauro
```

## Verificación

```bash
curl -sS -X POST "https://alexa.maurocastro.cl/v1/chat/completions" \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -H "x-openclaw-agent-id: mauro" \
  -d '{"model":"openclaw/mauro","messages":[{"role":"user","content":"ping"}],"stream":false}'
```

## Checklist Fase 2

- [ ] DNS `alexa` → IP DMZ
- [ ] Token dedicado en `.env` y snippet nginx
- [ ] Certificado TLS con SAN `alexa.maurocastro.cl`
- [ ] Proxy recargado
- [ ] `sam deploy` con URL pública
- [ ] SkillId en consola Alexa
