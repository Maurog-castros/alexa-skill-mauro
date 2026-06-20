const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeForSpeech, truncateForAlexa } = require('../lib/speech');

test('removes Markdown unsafe for voice output', () => {
  assert.equal(
    normalizeForSpeech('## Estado\n- **OK** [detalle](https://example.com)'),
    'Estado OK detalle',
  );
});

test('escapes SSML characters', () => {
  assert.equal(truncateForAlexa('A < B & C'), 'A &lt; B &amp; C');
});

test('limits long spoken responses', () => {
  const speech = truncateForAlexa('x'.repeat(1200));

  assert.ok(speech.length <= 900);
  assert.match(speech, /Respuesta resumida/);
});
