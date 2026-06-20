const { DEFAULT_AGENT_ID, OPENCLAW_MODEL_PREFIX, ALEXA_CHANNEL } = require('./constants');

class OpenClawClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.OPENCLAW_GATEWAY_URL || '').replace(/\/$/, '');
    this.token = options.token || process.env.OPENCLAW_GATEWAY_TOKEN || '';
    this.agentId = options.agentId || process.env.OPENCLAW_AGENT_ID || DEFAULT_AGENT_ID;
    this.timeoutMs = options.timeoutMs || Number(process.env.OPENCLAW_TIMEOUT_MS || 25000);
  }

  sessionKey(userId) {
    return `alexa:${userId}:${this.agentId}`;
  }

  async chat({ userId, message, history = [] }) {
    if (!this.baseUrl) {
      throw new Error('OPENCLAW_GATEWAY_URL no configurada');
    }

    const messages = [
      ...history,
      { role: 'user', content: message },
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
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
          messages,
          stream: false,
        }),
        signal: controller.signal,
      });

      const body = await response.text();
      let payload;

      try {
        payload = body ? JSON.parse(body) : {};
      } catch {
        throw new Error(`OpenClaw respondió con JSON inválido: ${body.slice(0, 200)}`);
      }

      if (!response.ok) {
        const detail = payload.error?.message || payload.message || body.slice(0, 200);
        throw new Error(`OpenClaw ${response.status}: ${detail}`);
      }

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenClaw no devolvió contenido en la respuesta');
      }

      return content.trim();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('OpenClaw tardó demasiado en responder');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { OpenClawClient };
