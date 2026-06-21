const assert = require('node:assert/strict');
const test = require('node:test');

const { buildHandlerInput } = require('./fixtures');
const { chatWithMauro } = require('../lib/mauro-chat');

function captureLogs(fn) {
  const lines = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => lines.push(args.join(' '));
  console.error = (...args) => lines.push(args.join(' '));

  return fn().finally(() => {
    console.log = originalLog;
    console.error = originalError;
  }).then(() => lines.join('\n'));
}

test('chatWithMauro logs success without sensitive fields', async () => {
  const originalChat = require('../lib/openclaw-client').OpenClawClient.prototype.chat;
  require('../lib/openclaw-client').OpenClawClient.prototype.chat = async () => 'Respuesta segura';

  try {
    const output = await captureLogs(async () => {
      await chatWithMauro(buildHandlerInput(), {
        userId: 'user-1',
        message: 'token-secreto-en-mensaje',
      });
    });

    const entry = JSON.parse(output.trim().split('\n').pop());
    assert.equal(entry.result, 'ok');
    assert.equal(entry.agent, 'mauro');
    assert.doesNotMatch(output, /token-secreto-en-mensaje/);
    assert.doesNotMatch(output, /Bearer/);
  } finally {
    require('../lib/openclaw-client').OpenClawClient.prototype.chat = originalChat;
  }
});

test('chatWithMauro logs timeout result', async () => {
  const { OpenClawTimeoutError } = require('../lib/openclaw-client');
  const originalChat = require('../lib/openclaw-client').OpenClawClient.prototype.chat;
  require('../lib/openclaw-client').OpenClawClient.prototype.chat = async () => {
    throw new OpenClawTimeoutError('timeout');
  };

  try {
    const output = await captureLogs(async () => {
      await assert.rejects(
        chatWithMauro(buildHandlerInput(), { userId: 'user-1', message: 'hola' }),
        OpenClawTimeoutError,
      );
    });

    const entry = JSON.parse(output.trim().split('\n').pop());
    assert.equal(entry.result, 'timeout');
    assert.equal(entry.agent, 'mauro');
  } finally {
    require('../lib/openclaw-client').OpenClawClient.prototype.chat = originalChat;
  }
});
