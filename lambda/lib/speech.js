const { MAX_SPEECH_LENGTH } = require('./constants');

function truncateForAlexa(text) {
  if (text.length <= MAX_SPEECH_LENGTH) {
    return text;
  }

  const trimmed = text.slice(0, MAX_SPEECH_LENGTH - 40).trim();
  return `${trimmed}… Te doy el resumen porque la respuesta es larga.`;
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
  truncateForAlexa,
  escapeSsml,
};
