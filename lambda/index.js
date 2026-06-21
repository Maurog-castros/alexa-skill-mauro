const Alexa = require('ask-sdk-core');
const { DEFAULT_AGENT_ID, SPEECH_ERROR, SPEECH_TIMEOUT } = require('./lib/constants');
const { OpenClawTimeoutError } = require('./lib/openclaw-client');
const { truncateForAlexa } = require('./lib/speech');
const { chatWithMauro } = require('./lib/mauro-chat');

function getUserId(handlerInput) {
  return handlerInput.requestEnvelope.context.System.user.userId;
}

function isMauroSession(attributes) {
  return attributes?.activeAgent === DEFAULT_AGENT_ID;
}

function startMauroSession(attributes) {
  return {
    ...attributes,
    activeAgent: DEFAULT_AGENT_ID,
  };
}

const LaunchMauroIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LaunchMauroIntent';
  },
  handle(handlerInput) {
    const attributes = startMauroSession(handlerInput.attributesManager.getSessionAttributes());

    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak('Hola, soy Mauro, tu agente personal. ¿En qué te puedo ayudar?')
      .reprompt('Puedes hacerme una pregunta o pedirme algo.')
      .getResponse();
  },
};

const ChatIntentHandler = {
  canHandle(handlerInput) {
    if (Alexa.getRequestType(handlerInput.requestEnvelope) !== 'IntentRequest') {
      return false;
    }

    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    if (intentName !== 'ChatIntent') {
      return false;
    }

    return isMauroSession(handlerInput.attributesManager.getSessionAttributes());
  },
  async handle(handlerInput) {
    const slots = handlerInput.requestEnvelope.request.intent.slots || {};
    const message = slots.message?.value?.trim();

    if (!message) {
      return handlerInput.responseBuilder
        .speak('No te entendí. ¿Puedes repetirlo?')
        .reprompt('Dime qué necesitas.')
        .getResponse();
    }

    const userId = getUserId(handlerInput);
    try {
      const reply = await chatWithMauro(handlerInput, {
        userId,
        message,
      });

      return handlerInput.responseBuilder
        .speak(truncateForAlexa(reply))
        .reprompt('¿Necesitas algo más?')
        .getResponse();
    } catch (error) {
      const speech = error instanceof OpenClawTimeoutError
        ? SPEECH_TIMEOUT
        : SPEECH_ERROR;

      return handlerInput.responseBuilder
        .speak(speech)
        .reprompt('¿Quieres intentarlo otra vez?')
        .getResponse();
    }
  },
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    return LaunchMauroIntentHandler.handle(handlerInput);
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Puedes decir: Alexa, abre agente personal Mauro. Luego hazme una pregunta o di salir para terminar.')
      .reprompt('¿Quieres hacer una pregunta?')
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && (
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
        || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'
      );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Hasta luego.')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(JSON.stringify({
      event: 'session_ended',
      reason: handlerInput.requestEnvelope.request.reason,
    }));
    return handlerInput.responseBuilder.getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
      && isMauroSession(handlerInput.attributesManager.getSessionAttributes());
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('No entendí la solicitud. ¿Puedes decirla de otra forma?')
      .reprompt('¿Qué necesitas?')
      .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(JSON.stringify({
      event: 'handler_error',
      requestId: handlerInput.requestEnvelope.request.requestId,
      errorType: error.constructor.name,
    }));
    return handlerInput.responseBuilder
      .speak('Ocurrió un error inesperado. Inténtalo otra vez.')
      .reprompt('¿Quieres intentarlo de nuevo?')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    LaunchMauroIntentHandler,
    ChatIntentHandler,
    FallbackIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient());

if (process.env.ALEXA_SKILL_ID) {
  skillBuilder.withSkillId(process.env.ALEXA_SKILL_ID);
}

const legacyHandler = skillBuilder.lambda();

exports.handler = async (event, context) => new Promise((resolve, reject) => {
  legacyHandler(event, context, (error, response) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(response);
  });
});

exports.handlers = {
  LaunchRequestHandler,
  LaunchMauroIntentHandler,
  ChatIntentHandler,
  HelpIntentHandler,
  FallbackIntentHandler,
};
