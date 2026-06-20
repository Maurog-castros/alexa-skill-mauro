const {
  DEFAULT_AGENT_ID,
  OPENCLAW_MODEL_PREFIX,
  ALEXA_CHANNEL,
  OPENCLAW_TIMEOUT_MS,
} = require('./constants');

class OpenClawConfigurationError extends Error {}
class OpenClawTimeoutError extends Error {}
class OpenClawResponseError extends Error {}

class OpenClawClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.OPENCLAW_GATEWAY_URL ?? '').replace(/\/$/, '');
    this.token = options.token ?? process.env.OPENCLAW_GATEWAY_TOKEN ?? '';
    this.agentId = options.agentId ?? process.env.OPENCLAW_AGENT_ID ?? DEFAULT_AGENT_ID;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.OPENCLAW_TIMEOUT_MS || OPENCLAW_TIMEOUT_MS);
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  sessionKey(userId) {
    return `alexa:${userId}:${this.agentId}`;
  }

  async chat({ userId, message }) {
    if (!this.baseUrl) {
      throw new OpenClawConfigurationError('OPENCLAW_GATEWAY_URL no configurada');
    }

    if (!this.token) {
      throw new OpenClawConfigurationError('OPENCLAW_GATEWAY_TOKEN no configurado');
    }

    if (!message?.trim()) {
      throw new OpenClawConfigurationError('Mensaje vacío');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'x-openclaw-session-key': this.sessionKey(userId),
          'x-openclaw-message-channel': ALEXA_CHANNEL,
          'x-openclaw-agent-id': this.agentId,
        },
        body: JSON.stringify({
          model: `${OPENCLAW_MODEL_PREFIX}${this.agentId}`,
          messages: [{ role: 'user', content: message.trim() }],
          stream: false,
        }),
        signal: controller.signal,
      });

      const body = await response.text();
      let payload;

      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        throw new OpenClawResponseError('OpenClaw respondió con JSON inválido');
      }

      if (!response.ok) {
        throw new OpenClawResponseError(`OpenClaw respondió HTTP ${response.status}`);
      }

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new OpenClawResponseError('OpenClaw no devolvió contenido');
      }

      return content.trim();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new OpenClawTimeoutError('OpenClaw excedió el límite de respuesta');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = {
  OpenClawClient,
  OpenClawConfigurationError,
  OpenClawTimeoutError,
  OpenClawResponseError,
};
