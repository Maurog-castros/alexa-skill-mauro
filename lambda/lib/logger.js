const {
  OpenClawTimeoutError,
  OpenClawResponseError,
} = require('./openclaw-client');

function logOpenClawRequest({ requestId, agent, result, durationMs, errorType }) {
  const entry = {
    event: 'openclaw_request',
    requestId,
    agent,
    result,
    durationMs,
  };

  if (errorType) {
    entry.errorType = errorType;
  }

  const line = JSON.stringify(entry);

  if (result === 'ok') {
    console.log(line);
  } else {
    console.error(line);
  }

  return line;
}

function classifyOpenClawError(error) {
  if (error instanceof OpenClawTimeoutError) {
    return { result: 'timeout', errorType: error.constructor.name };
  }

  if (error instanceof OpenClawResponseError) {
    const isEmpty = /no devolvió contenido/i.test(error.message);
    return {
      result: isEmpty ? 'empty' : 'error',
      errorType: error.constructor.name,
    };
  }

  return { result: 'error', errorType: error.constructor.name };
}

module.exports = {
  logOpenClawRequest,
  classifyOpenClawError,
};
