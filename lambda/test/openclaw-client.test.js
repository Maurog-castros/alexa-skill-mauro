const assert = require('node:assert/strict');
const test = require('node:test');

const {
  OpenClawClient,
  OpenClawConfigurationError,
  OpenClawTimeoutError,
} = require('../lib/openclaw-client');

test('sends one user message and stable Alexa session headers', async () => {
  let captured;
  const client = new OpenClawClient({
    baseUrl: 'https://gateway.example.com/',
    token: 'secret',
    agentId: 'care',
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
  assert.equal(captured.options.headers['x-openclaw-session-key'], 'alexa:user-1:care');
  assert.deepEqual(body.messages, [{ role: 'user', content: 'estado' }]);
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
