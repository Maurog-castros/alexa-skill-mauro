const assert = require('node:assert/strict');
const test = require('node:test');

const { logOpenClawRequest, classifyOpenClawError } = require('../lib/logger');
const {
  OpenClawTimeoutError,
  OpenClawResponseError,
} = require('../lib/openclaw-client');

function captureLogs(fn) {
  const lines = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => lines.push(args.join(' '));
  console.error = (...args) => lines.push(args.join(' '));

  try {
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  return lines.join('\n');
}

test('structured log includes requestId, agent, result and duration', () => {
  const output = captureLogs(() => {
    logOpenClawRequest({
      requestId: 'req-123',
      agent: 'mauro',
      result: 'ok',
      durationMs: 42,
    });
  });

  const entry = JSON.parse(output);
  assert.equal(entry.requestId, 'req-123');
  assert.equal(entry.agent, 'mauro');
  assert.equal(entry.result, 'ok');
  assert.equal(entry.durationMs, 42);
});

test('logs never include token or message content', () => {
  const output = captureLogs(() => {
    logOpenClawRequest({
      requestId: 'req-456',
      agent: 'mauro',
      result: 'error',
      durationMs: 100,
      errorType: 'OpenClawResponseError',
    });
  });

  assert.doesNotMatch(output, /Bearer/i);
  assert.doesNotMatch(output, /secret-token-value/i);
  assert.doesNotMatch(output, /contenido privado/i);
});

test('classifies timeout and empty responses', () => {
  assert.deepEqual(
    classifyOpenClawError(new OpenClawTimeoutError('timeout')),
    { result: 'timeout', errorType: 'OpenClawTimeoutError' },
  );
  assert.deepEqual(
    classifyOpenClawError(new OpenClawResponseError('OpenClaw no devolvió contenido')),
    { result: 'empty', errorType: 'OpenClawResponseError' },
  );
});
