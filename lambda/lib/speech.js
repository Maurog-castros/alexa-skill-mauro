const { MAX_SPEECH_LENGTH } = require('./constants');

function normalizeForSpeech(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' contenido técnico omitido ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`#>~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateForAlexa(text) {
  const speech = normalizeForSpeech(text);

  if (speech.length <= MAX_SPEECH_LENGTH) {
    return escapeSsml(speech);
  }

  const trimmed = speech.slice(0, MAX_SPEECH_LENGTH - 60).trim();
  return escapeSsml(`${trimmed}… Respuesta resumida por límite de voz.`);
}

function escapeSsml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  normalizeForSpeech,
  truncateForAlexa,
  escapeSsml,
};
