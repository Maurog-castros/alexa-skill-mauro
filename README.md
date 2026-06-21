# alexa-skill-mauro

Interfaz de voz de Alexa para agentes OpenClaw. El agente MVP es **`mauro`**.

```
Usuario → Alexa → Lambda → OpenClaw Gateway → agente mauro
```

## Criterios de aceptación MVP

- "Alexa, abre agente personal Mauro" inicia la skill.
- Respuesta antes de ~7 s (OpenClaw aborta a los 6 s).
- 10 consultas consecutivas estables.
- Timeout con mensaje degradado claro (no corte abrupto).
- Contexto vía sesión OpenClaw; cada turno envía solo el mensaje actual.
- Token nunca en voz ni logs.

## Uso por voz

- "Alexa, abre agente personal Mauro"
- En sesión: "¿cuál es el estado de los containers?", etc.

## Estructura

```
skill-package/interactionModel.json   # modelo de voz (es-ES)
lambda/                               # handler ASK → OpenClaw
infrastructure/template.yaml          # despliegue AWS SAM
docs/secure-gateway.md                # HTTPS, token, rate limit
```

## Fase 1 — Puente estabilizado

| Comportamiento | Implementación |
| --- | --- |
| Agente unificado `mauro` | `OPENCLAW_AGENT_ID`, constantes, intents |
| Timeout OpenClaw 6 s | `OPENCLAW_TIMEOUT_MS=6000` + `AbortController` |
| Una respuesta progresiva ~2 s | `progressive-response.js` |
| Degradación en timeout | `SPEECH_TIMEOUT` en `ChatIntent` |
| Markdown + límite 600–900 chars | `speech.js` |
| Solo mensaje actual | `messages: [{ role: 'user', content }]` |
| Logs estructurados | `logger.js`: requestId, agent, result, durationMs |

## Fase 2 — Endpoint seguro

Publicar **`https://alexa.maurocastro.cl`** (solo `/v1/chat/completions`):

```bash
chmod +x scripts/setup-alexa-endpoint.sh
./scripts/setup-alexa-endpoint.sh
```

Detalle: [docs/secure-gateway.md](docs/secure-gateway.md) y `~/Dev/infra/maurocastro-dmz/docs/ALEXA-ENDPOINT.md`.

## Fase 3 — Tests

```bash
cd lambda && npm test
```

Cubre launch, help, pregunta válida, timeout, HTTP 401/500, JSON inválido, respuesta vacía/larga, y ausencia de datos sensibles en logs.

## Fase 4 — Despliegue

### 1. Prerrequisitos

```bash
# AWS SAM CLI
sam --version

# Dependencias Lambda
cd lambda && npm install && cd ..
cp .env.example .env   # credenciales locales
```

### 2. Build y deploy

```bash
sam validate --lint -t infrastructure/template.yaml
sam build -t infrastructure/template.yaml
sam deploy --guided \
  --parameter-overrides \
    OpenClawGatewayUrl=https://tu-gateway \
    OpenClawGatewayToken=TU_TOKEN \
    OpenClawAgentId=mauro \
    AlexaSkillId=amzn1.ask.skill.TU_SKILL_ID
```

### 3. Alexa Developer Console

1. Crear **Custom Skill** → nombre de invocación: `agente personal mauro`.
2. Locale compatible con el dispositivo (`es-US`, `es-MX` o `es-ES`).
3. Importar `skill-package/interactionModel.json`.
4. Endpoint: ARN de la Lambda (output `LambdaArn` del stack).
5. Pegar el **Skill ID** en el parámetro SAM si aún no lo hiciste.
6. Activar **Development**; no enviar a certificación todavía.

Referencias Amazon: [Steps to Build a Custom Skill](https://developer.amazon.com/en-US/docs/alexa/custom-skills/steps-to-build-a-custom-skill.html), [Host as AWS Lambda](https://developer.amazon.com/en-US/docs/alexa/custom-skills/host-a-custom-skill-as-an-aws-lambda-function.html).

## OpenClaw local

```bash
chmod +x scripts/setup-openclaw-care.sh
./scripts/setup-openclaw-care.sh
```

Configura `.env`:

```bash
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18791
OPENCLAW_GATEWAY_TOKEN=<token del gateway>
OPENCLAW_AGENT_ID=mauro
```

La Lambda llama a:

```http
POST /v1/chat/completions
model: openclaw/mauro
x-openclaw-session-key: alexa:{userId}:mauro
x-openclaw-message-channel: alexa
```

## Variables de entorno

| Variable | Default | Descripción |
| --- | --- | --- |
| `OPENCLAW_GATEWAY_URL` | — | URL base del Gateway |
| `OPENCLAW_GATEWAY_TOKEN` | — | Bearer token del Gateway |
| `OPENCLAW_AGENT_ID` | `mauro` | Agente destino |
| `OPENCLAW_TIMEOUT_MS` | `6000` | Timeout HTTP OpenClaw |
| `ALEXA_SKILL_ID` | — | SkillId permitido |

## Respuestas progresivas

Si OpenClaw tarda más de ~2 s:

- "Dame un momento, Mauro está pensando."

La respuesta completa debe terminar antes del límite de Alexa (~7 s efectivos).
