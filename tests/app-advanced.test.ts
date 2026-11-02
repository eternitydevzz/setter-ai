import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { createLinkToken, deriveLinkSecret } from '../src/links.js';
import { TokenManager } from '../src/meta/token.js';
import { TEST_SETTER_CONFIG, createMemoryStore } from './helpers.js';

const config: Config = {
  port: 3000,
  databaseUrl: 'postgres://no-se-usa',
  adminPassword: 'contraseña-larga-123',
  webhookVerifyToken: 'token-verificacion',
  appSecrets: ['secreto-ig'],
  igAccessToken: null,
  igApiVersion: 'v25.0',
  tokenEncryptionKey: 'clave-de-cifrado-larga-123',
  limits: { privateReplies: 700, publicReplies: 700, followUps: 3000 },
  delays: { commentMin: 1000, commentMax: 2000, followUpMin: 300, followUpMax: 800 },
  publicBaseUrl: 'https://setter.example.com',
  setter: TEST_SETTER_CONFIG,
};
const SECRET = deriveLinkSecret(config.tokenEncryptionKey as string);

function setup(linkSecret: string | null = SECRET) {
  const store = createMemoryStore();
  const tokens = new TokenManager({ store, envToken: null, encryptionKey: null });
  const app = createApp({ config, store, client: null, tokens, linkSecret, processPayload: vi.fn() });
  return { app, store };
}

describe('enlaces con seguimiento /l/:token', () => {
  it('registra el clic, añade las etiquetas al contacto y redirige al destino real', async () => {
    const { app, store } = setup();
    const token = createLinkToken(SECRET, { f: 'manychat1', n: 'biblioteca', b: 0, r: '9', u: 'https://biblioteca.example.com', t: ['biblioteca'] });
    const res = await app.request(`/l/${token}`);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://biblioteca.example.com');
    expect(store.contacts.get('9')?.tags).toEqual(['biblioteca']);
    expect(store.events[0]?.kind).toBe('click');
  });

  it('enlace falso o seguimiento desactivado → 404 (nunca redirige a sitios no firmados)', async () => {
    expect((await setup().app.request('/l/falso.falso')).status).toBe(404);
    const token = createLinkToken(SECRET, { f: 'f', n: 'n', b: 0, r: '9', u: 'https://a.com', t: [] });
    expect((await setup(null).app.request(`/l/${token}`)).status).toBe(404);
  });

  it('si falla el registro, la persona igualmente llega a su destino', async () => {
    const { app, store } = setup();
    store.logEvent = vi.fn().mockRejectedValue(new Error('BD caída'));
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const token = createLinkToken(SECRET, { f: 'f', n: 'n', b: 0, r: '9', u: 'https://a.com', t: [] });
    expect((await app.request(`/l/${token}`)).status).toBe(302);
    stderr.mockRestore();
  });
});

