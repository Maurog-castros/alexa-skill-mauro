const { PROGRESSIVE_DELAY_MS } = require('./constants');

const PROGRESSIVE_MESSAGES = [
  { afterMs: PROGRESSIVE_DELAY_MS, text: 'Dame un momento, Mauro está pensando.' },
];

async function sendProgressiveResponse(handlerInput, text) {
  const factory = handlerInput.serviceClientFactory;
  if (!factory) {
    console.warn(JSON.stringify({ event: 'progressive_skipped', reason: 'no_service_client' }));
    return;
  }

  const directiveServiceClient = factory.getDirectiveServiceClient();
  const requestId = handlerInput.requestEnvelope.request.requestId;

  await directiveServiceClient.enqueue({
    header: { requestId },
    directive: {
      type: 'VoicePlayer.Speak',
      speech: text,
    },
  });
}

function scheduleProgressiveResponses(handlerInput) {
  const timers = PROGRESSIVE_MESSAGES.map(({ afterMs, text }) => setTimeout(async () => {
    try {
      await sendProgressiveResponse(handlerInput, text);
    } catch (error) {
      console.error(JSON.stringify({
        event: 'progressive_error',
        requestId: handlerInput.requestEnvelope.request.requestId,
        errorType: error.constructor.name,
      }));
    }
  }, afterMs));

  return () => {
    timers.forEach(clearTimeout);
  };
}

module.exports = {
  sendProgressiveResponse,
  scheduleProgressiveResponses,
};
