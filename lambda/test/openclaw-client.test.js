const assert = require('node:assert/strict');
const test = require('node:test');

const {
  OpenClawClient,
  OpenClawConfigurationError,
  OpenClawTimeoutError,
  OpenClawResponseError,
} = require('../lib/openclaw-client');
const { OPENCLAW_TIMEOUT_MS } = require('../lib/constants');

test('sends one user message and stable Alexa session headers', async () => {
  let captured;
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com/',
    token: 'secret',
    agentId: 'mauro',
    fetch: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({
        choices: [{ message: { content: ' Respuesta breve ' } }],
      }), { status: 200 });
    },
  });

  const reply = await client.chat({ userId: 'user-1', message: ' estado ' });
  const body = JSON.parse(captured.options.body);

  assert.equal(reply, 'Respuesta breve');
  assert.equal(captured.url, 'https://gateway.example.com/v1/chat/completions');
  assert.equal(captured.options.headers.Authorization, 'Bearer secret');
  assert.equal(captured.options.headers['x-openclaw-session-key'], 'alexa:user-1:mauro');
  assert.deepEqual(body.messages, [{ role: 'user', content: 'estado' }]);
  assert.equal(body.stream, false);
});

test('rejects missing gateway token before network I/O', async () => {
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com',
    token: '',
    fetch: async () => assert.fail('fetch must not run'),
  });

  await assert.rejects(
    client.chat({ userId: 'user-1', message: 'hola' }),
    OpenClawConfigurationError,
  );
});

test('uses 6 second abort timeout by default', () => {
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com',
    token: 'secret',
  });

  assert.equal(client.timeoutMs, OPENCLAW_TIMEOUT_MS);
  assert.equal(client.timeoutMs, 6000);
});

test('converts aborts into OpenClawTimeoutError', async () => {
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com',
    token: 'secret',
    timeoutMs: 5,
    fetch: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  });

  await assert.rejects(
    client.chat({ userId: 'user-1', message: 'hola' }),
    OpenClawTimeoutError,
  );
});

test('rejects HTTP 401', async () => {
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com',
    token: 'secret',
    fetch: async () => new Response('{}', { status: 401 }),
  });

  await assert.rejects(
    client.chat({ userId: 'user-1', message: 'hola' }),
    (error) => error instanceof OpenClawResponseError && /401/.test(error.message),
  );
});

test('rejects HTTP 500', async () => {
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com',
    token: 'secret',
    fetch: async () => new Response('{}', { status: 500 }),
  });

  await assert.rejects(
    client.chat({ userId: 'user-1', message: 'hola' }),
    (error) => error instanceof OpenClawResponseError && /500/.test(error.message),
  );
});

test('rejects invalid JSON without exposing response body', async () => {
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com',
    token: 'secret',
    fetch: async () => new Response('private upstream data', { status: 200 }),
  });

  await assert.rejects(
    client.chat({ userId: 'user-1', message: 'hola' }),
    (error) => {
      assert.equal(error.message, 'OpenClaw respondió con JSON inválido');
      assert.doesNotMatch(error.message, /private upstream data/);
      return true;
    },
  );
});

test('rejects empty OpenClaw content', async () => {
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com',
    token: 'secret',
    fetch: async () => new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 }),
  });

  await assert.rejects(
    client.chat({ userId: 'user-1', message: 'hola' }),
    (error) => error instanceof OpenClawResponseError && /no devolvió contenido/i.test(error.message),
  );
});
