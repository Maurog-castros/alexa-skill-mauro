# alexa-skill-mauro

Interfaz de voz de Alexa para agentes OpenClaw. El primer agente es **`/care`**.

```
Usuario → Alexa → Lambda → OpenClaw Gateway → agente care → Qwen / GPT / Claude
```

## Uso por voz

- "Alexa, abre agente personal Mauro"
- "Alexa, cambia a modo agente personal Mauro"
- Luego, en sesión: "¿cual es el estado de los containers?", "Resumen de avances en proyectos en base a repos de github", etc.

## Estructura

```
skill-package/interactionModel.json   # modelo de voz (es-ES)
lambda/                               # handler ASK → OpenClaw
infrastructure/template.yaml          # despliegue AWS SAM
docs/openclaw-care-agent.example.json5
```

## Requisitos OpenClaw

1. Gateway accesible desde Lambda (Tailscale, túnel o reverse proxy con auth).
2. Endpoint HTTP habilitado:

```bash
openclaw config set gateway.http.endpoints.chatCompletions.enabled true
openclaw gateway restart
```

3. Agente `care` definido en `~/.openclaw/openclaw.json` (ver ejemplo en `docs/`).

La Lambda llama a:

```http
POST /v1/chat/completions
model: openclaw/care
x-openclaw-session-key: alexa:{userId}:care
x-openclaw-message-channel: alexa
```

## OpenClaw local (agente care)

Tu instalación principal está en **Docker** (`openclaw-openclaw-gateway-1`). El agente `care` ya existe en `~/Dev/openclaw-mauro/data/workspace/care`.

```bash
chmod +x scripts/setup-openclaw-care.sh
./scripts/setup-openclaw-care.sh
```

Configura el token en `.env`:

```bash
# URL directa al Gateway (no pasa por nginx :18789)
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18791
OPENCLAW_GATEWAY_TOKEN=<token del gateway>
```

Si el contenedor no arranca, verifica que Docker apunte al repo real:

```bash
# En openclaw/.env debe existir:
OPENCLAW_PROJECT_DIR=/home/mauro/Dev/openclaw-mauro

# Restaurar symlink canónico (scripts Python lo usan):
sudo /home/mauro/Dev/openclaw-mauro/scripts/fix-openclaw-mount-path.sh
cd ~/Dev/openclaw-mauro/openclaw && docker compose up -d openclaw-gateway
```

## Respuestas progresivas

Si OpenClaw tarda más de ~2 s, Alexa recibe mensajes intermedios mientras Lambda sigue esperando:

- "Dame un momento, Care está pensando." (2 s)

La respuesta completa debe terminar antes del límite de Alexa. El cliente cancela
OpenClaw a los 6 segundos para dejar margen a Lambda.

Requiere `.withApiClient(new Alexa.DefaultApiClient())` en el handler (ya incluido).

## Despliegue

```bash
cd lambda && npm install && cd ..
cp .env.example .env   # editar credenciales locales si pruebas fuera de SAM

sam build -t infrastructure/template.yaml
sam deploy --guided \
  --parameter-overrides \
    OpenClawGatewayUrl=https://tu-gateway \
    OpenClawGatewayToken=TU_TOKEN \
    AlexaSkillId=amzn1.ask.skill.TU_SKILL_ID
```

Registra el ARN de la Lambda en [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) y sube `skill-package/interactionModel.json`.

## Variables de entorno

| Variable                   | Default   | Descripción                 |
| -------------------------- | --------- | ---------------------------- |
| `OPENCLAW_GATEWAY_URL`   | —        | URL base del Gateway         |
| `OPENCLAW_GATEWAY_TOKEN` | —        | Bearer token del Gateway     |
| `OPENCLAW_AGENT_ID`      | `care`  | Agente destino               |
| `OPENCLAW_TIMEOUT_MS`    | `6000` | Timeout de la petición HTTP |
| `ALEXA_SKILL_ID`         | —      | ID permitido para invocar la Lambda |

## Próximos agentes

El mismo patrón sirve para DevOps, ventas, finanzas, monitoreo y soporte N1: añadir intents/slots y mapear a otro `agentId` en OpenClaw.
