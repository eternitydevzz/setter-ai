import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import type { InstagramClient } from '../src/meta/client.js';
import { TokenManager } from '../src/meta/token.js';
import { TEST_SETTER_CONFIG, commentPayload, createMemoryStore } from './helpers.js';

const config: Config = {
  port: 3000,
  databaseUrl: 'postgres://no-se-usa',
  adminPassword: 'contraseña-larga-123',
  webhookVerifyToken: 'token-verificacion',
  appSecrets: ['secreto-ig'],
  igAccessToken: null,
  igApiVersion: 'v25.0',
  tokenEncryptionKey: null,
  publicBaseUrl: null,
  limits: { privateReplies: 700, publicReplies: 700, followUps: 3000 },
  delays: { commentMin: 1000, commentMax: 2000, followUpMin: 300, followUpMax: 800 },
  setter: TEST_SETTER_CONFIG,
};

const HOST = 'http://localhost';

function setup(client: InstagramClient | null = null) {
  const store = createMemoryStore();
  const processPayload = vi.fn();
  const tokens = new TokenManager({ store, envToken: null, encryptionKey: null });
  const app = createApp({ config, store, client, tokens, processPayload, linkSecret: null });
  return { app, store, processPayload };
}

function signedPost(body: string, secret = 'secreto-ig') {
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  return new Request(`${HOST}/webhooks/instagram`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
    body,
  });
}

describe('webhook', () => {
  it('verificación GET: challenge con el token correcto, 403 si no', async () => {
    const { app } = setup();
    const ok = await app.request('/webhooks/instagram?hub.mode=subscribe&hub.verify_token=token-verificacion&hub.challenge=42');
    expect(await ok.text()).toBe('42');
    expect((await app.request('/webhooks/instagram?hub.mode=subscribe&hub.verify_token=malo&hub.challenge=1')).status).toBe(403);
  });

  it('POST con firma válida se procesa; con firma falsa no, y NO se guarda (B4: nadie llena la base)', async () => {
    const { app, store, processPayload } = setup();
    expect((await app.request(signedPost(JSON.stringify(commentPayload())))).status).toBe(200);
    expect(processPayload).toHaveBeenCalledTimes(1);
    expect((await app.request(signedPost('{}', 'falso'))).status).toBe(403);
    expect(processPayload).toHaveBeenCalledTimes(1);
    expect(store.requests.map((r) => r.signatureOk)).toEqual([true]);
  });

  it('un cuerpo de más de 1 MB se rechaza (413) sin guardarlo ni procesarlo (B4)', async () => {
    const { app, store, processPayload } = setup();
    const huge = JSON.stringify({ relleno: 'x'.repeat(1_100_000) });
    expect((await app.request(signedPost(huge))).status).toBe(413);
    expect(store.requests).toEqual([]);
    expect(processPayload).not.toHaveBeenCalled();
  });

  it('JSON roto con firma válida no rompe el servidor', async () => {
    const { app, store } = setup();
    expect((await app.request(signedPost('{roto'))).status).toBe(200);
    expect(store.requests[0]?.payload).toEqual({ invalidJson: '{roto' });
  });
});

describe('páginas públicas', () => {
  it.each(['/privacy', '/terms', '/data-deletion', '/healthz', '/'])('%s responde 200', async (path) => {
    expect((await setup().app.request(path)).status).toBe(200);
  });
});

