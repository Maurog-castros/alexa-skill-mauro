const { OpenClawClient } = require('./openclaw-client');
const { scheduleProgressiveResponses } = require('./progressive-response');

const openclaw = new OpenClawClient();

async function chatWithCare(handlerInput, { userId, message }) {
  const cancelProgressive = scheduleProgressiveResponses(handlerInput);
  const startedAt = Date.now();
  const requestId = handlerInput.requestEnvelope.request.requestId;

  try {
    const reply = await openclaw.chat({ userId, message });
    console.log(JSON.stringify({
      event: 'openclaw_request',
      requestId,
      status: 'ok',
      durationMs: Date.now() - startedAt,
    }));
    return reply;
  } catch (error) {
    console.error(JSON.stringify({
      event: 'openclaw_request',
      requestId,
      status: 'error',
      errorType: error.constructor.name,
      durationMs: Date.now() - startedAt,
    }));
    throw error;
  } finally {
    cancelProgressive();
  }
}

module.exports = { chatWithCare };
