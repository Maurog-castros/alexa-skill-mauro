const Alexa = require('ask-sdk-core');

function buildHandlerInput({
  requestType = 'LaunchRequest',
  intentName,
  slots = {},
  sessionAttributes = {},
  requestId = 'req-test-1',
  userId = 'amzn1.ask.account.test-user',
} = {}) {
  const request = {
    requestId,
    type: requestType,
  };

  if (requestType === 'IntentRequest') {
    request.intent = {
      name: intentName,
      slots: Object.fromEntries(
        Object.entries(slots).map(([name, value]) => [name, { name, value }]),
      ),
    };
  }

  const attributes = { ...sessionAttributes };

  return {
    requestEnvelope: {
      request,
      context: {
        System: {
          user: { userId },
        },
      },
    },
    attributesManager: {
      getSessionAttributes() {
        return attributes;
      },
      setSessionAttributes(next) {
        Object.keys(attributes).forEach((key) => delete attributes[key]);
        Object.assign(attributes, next);
      },
    },
    responseBuilder: Alexa.ResponseFactory.init(),
    serviceClientFactory: null,
  };
}

function getSpeech(response) {
  const speech = response.outputSpeech;
  if (!speech) {
    return '';
  }

  if (speech.ssml) {
    return speech.ssml.replace(/<\/?speak>/g, '');
  }

  return speech.text || '';
}

module.exports = {
  buildHandlerInput,
  getSpeech,
};
