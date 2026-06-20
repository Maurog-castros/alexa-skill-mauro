const { OpenClawClient } = require('./openclaw-client');
const { scheduleProgressiveResponses } = require('./progressive-response');

const openclaw = new OpenClawClient();

async function chatWithCare(handlerInput, { userId, message, history }) {
  const cancelProgressive = scheduleProgressiveResponses(handlerInput);

  try {
    return await openclaw.chat({ userId, message, history });
  } finally {
    cancelProgressive();
  }
}

module.exports = { chatWithCare };
