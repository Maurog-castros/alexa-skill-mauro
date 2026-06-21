const DEFAULT_AGENT_ID = 'mauro';

module.exports = {
  DEFAULT_AGENT_ID,
  OPENCLAW_MODEL_PREFIX: 'openclaw/',
  ALEXA_CHANNEL: 'alexa',
  MIN_SPEECH_LENGTH: 600,
  MAX_SPEECH_LENGTH: 900,
  OPENCLAW_TIMEOUT_MS: 6000,
  PROGRESSIVE_DELAY_MS: 2000,
  SPEECH_TIMEOUT: 'Mauro tardó demasiado en responder. Repite la pregunta o hazla más corta.',
  SPEECH_ERROR: 'No pude contactar a Mauro en este momento. Inténtalo de nuevo en unos segundos.',
};
