const assert = require('node:assert/strict');
const test = require('node:test');

const { DEFAULT_AGENT_ID, OPENCLAW_TIMEOUT_MS } = require('../lib/constants');
const { OpenClawClient, OpenClawTimeoutError } = require('../lib/openclaw-client');
const { handlers } = require('../index');
const { buildHandlerInput, getSpeech } = require('./fixtures');

test('LaunchRequest starts Mauro session with greeting', async () => {
  const handlerInput = buildHandlerInput({ requestType: 'LaunchRequest' });
  const response = await handlers.LaunchRequestHandler.handle(handlerInput);

  assert.equal(handlerInput.attributesManager.getSessionAttributes().activeAgent, DEFAULT_AGENT_ID);
  assert.match(getSpeech(response), /Mauro/);
});

test('HelpIntent explains invocation phrase', async () => {
  const handlerInput = buildHandlerInput({
    requestType: 'IntentRequest',
    intentName: 'AMAZON.HelpIntent',
  });
  const response = await handlers.HelpIntentHandler.handle(handlerInput);

  assert.match(getSpeech(response), /agente personal Mauro/i);
});

test('ChatIntent returns OpenClaw reply for valid question', async () => {
  const original = OpenClawClient.prototype.chat;
  OpenClawClient.prototype.chat = async () => 'Todo en orden.';

  try {
    const handlerInput = buildHandlerInput({
      requestType: 'IntentRequest',
      intentName: 'ChatIntent',
      sessionAttributes: { activeAgent: DEFAULT_AGENT_ID },
      slots: { message: '¿cuál es el estado?' },
    });
    const response = await handlers.ChatIntentHandler.handle(handlerInput);

    assert.match(getSpeech(response), /Todo en orden/);
  } finally {
    OpenClawClient.prototype.chat = original;
  }
});

test('ChatIntent returns degraded speech on timeout', async () => {
  const original = OpenClawClient.prototype.chat;
  OpenClawClient.prototype.chat = async () => {
    throw new OpenClawTimeoutError('timeout');
  };

  try {
    const handlerInput = buildHandlerInput({
      requestType: 'IntentRequest',
      intentName: 'ChatIntent',
      sessionAttributes: { activeAgent: DEFAULT_AGENT_ID },
      slots: { message: 'pregunta larga' },
    });
    const response = await handlers.ChatIntentHandler.handle(handlerInput);

    assert.match(getSpeech(response), /tardó demasiado/i);
    assert.doesNotMatch(getSpeech(response), /error inesperado/i);
  } finally {
    OpenClawClient.prototype.chat = original;
  }
});

test('OpenClaw client default timeout is 6 seconds', () => {
  assert.equal(OPENCLAW_TIMEOUT_MS, 6000);
});
