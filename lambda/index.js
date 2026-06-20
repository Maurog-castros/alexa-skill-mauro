const Alexa = require('ask-sdk-core');
const { DEFAULT_AGENT_ID } = require('./lib/constants');
const { truncateForAlexa } = require('./lib/speech');
const { chatWithCare } = require('./lib/care-chat');

function getUserId(handlerInput) {
  return handlerInput.requestEnvelope.context.System.user.userId;
}

function isCareSession(attributes) {
  return attributes?.activeAgent === DEFAULT_AGENT_ID;
}

function startCareSession(attributes) {
  return {
    ...attributes,
    activeAgent: DEFAULT_AGENT_ID,
    history: [],
  };
}

function appendHistory(attributes, role, content) {
  const history = [...(attributes.history || []), { role, content }];
  const maxMessages = Number(process.env.OPENCLAW_HISTORY_LIMIT || 10);
  return {
    ...attributes,
    history: history.slice(-maxMessages),
  };
}

const LaunchCareIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LaunchCareIntent';
  },
  handle(handlerInput) {
    const attributes = startCareSession(handlerInput.attributesManager.getSessionAttributes());

    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak(`Hola, soy Care. ¿En qué te puedo ayudar?`)
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

    return isCareSession(handlerInput.attributesManager.getSessionAttributes());
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
    let attributes = handlerInput.attributesManager.getSessionAttributes();

    try {
      const reply = await chatWithCare(handlerInput, {
        userId,
        message,
        history: attributes.history || [],
      });

      attributes = appendHistory(appendHistory(attributes, 'user', message), 'assistant', reply);
      handlerInput.attributesManager.setSessionAttributes(attributes);

      return handlerInput.responseBuilder
        .speak(truncateForAlexa(reply))
        .reprompt('¿Necesitas algo más?')
        .getResponse();
    } catch (error) {
      console.error('OpenClaw error:', error);

      return handlerInput.responseBuilder
        .speak('No pude contactar a Care en este momento. Inténtalo de nuevo en unos segundos.')
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
    return LaunchCareIntentHandler.handle(handlerInput);
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Puedes decir: Alexa, abre Care, y luego hablar conmigo con naturalidad. También puedes decir salir para terminar.')
      .reprompt('¿Quieres empezar a hablar con Care?')
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
    console.log('Session ended:', handlerInput.requestEnvelope.request.reason);
    return handlerInput.responseBuilder.getResponse();
  },
};

const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent'
      && isCareSession(handlerInput.attributesManager.getSessionAttributes());
  },
  async handle(handlerInput) {
    handlerInput.requestEnvelope.request.intent = {
      name: 'ChatIntent',
      slots: {
        message: {
          name: 'message',
          value: 'No entendí bien lo anterior. ¿Puedes ayudarme con lo que estábamos hablando?',
        },
      },
    };

    return ChatIntentHandler.handle(handlerInput);
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Unhandled error:', error);
    return handlerInput.responseBuilder
      .speak('Ocurrió un error inesperado. Inténtalo otra vez.')
      .reprompt('¿Quieres intentarlo de nuevo?')
      .getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    LaunchCareIntentHandler,
    ChatIntentHandler,
    FallbackIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
