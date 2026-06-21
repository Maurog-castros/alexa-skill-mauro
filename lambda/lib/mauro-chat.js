const { DEFAULT_AGENT_ID } = require('./constants');
const { logOpenClawRequest, classifyOpenClawError } = require('./logger');
const { OpenClawClient } = require('./openclaw-client');
const { scheduleProgressiveResponses } = require('./progressive-response');

const openclaw = new OpenClawClient();

async function chatWithMauro(handlerInput, { userId, message }) {
  const cancelProgressive = scheduleProgressiveResponses(handlerInput);
  const startedAt = Date.now();
  const requestId = handlerInput.requestEnvelope.request.requestId;
  const agent = openclaw.agentId || DEFAULT_AGENT_ID;

  try {
    const reply = await openclaw.chat({ userId, message });
    logOpenClawRequest({
      requestId,
      agent,
      result: 'ok',
      durationMs: Date.now() - startedAt,
    });
    return reply;
  } catch (error) {
    const { result, errorType } = classifyOpenClawError(error);
    logOpenClawRequest({
      requestId,
      agent,
      result,
      durationMs: Date.now() - startedAt,
      errorType,
    });
    throw error;
  } finally {
    cancelProgressive();
  }
}

module.exports = { chatWithMauro };
