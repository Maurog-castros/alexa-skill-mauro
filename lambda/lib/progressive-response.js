const PROGRESSIVE_MESSAGES = [
  { afterMs: 2000, text: 'Dame un momento, Care está pensando.' },
  { afterMs: 7000, text: 'Sigo consultando, casi termino.' },
  { afterMs: 14000, text: 'Todavía estoy procesando tu solicitud.' },
];

async function sendProgressiveResponse(handlerInput, text) {
  const factory = handlerInput.serviceClientFactory;
  if (!factory) {
    console.warn('serviceClientFactory no disponible; omite respuesta progresiva');
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
      console.error('Progressive response error:', error);
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
