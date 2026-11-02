import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { Config } from './config.js';
import { MetaApiError, type InstagramClient } from './meta/client.js';
import { isValidSignature } from './meta/signature.js';
import type { TokenManager } from './meta/token.js';
import { readLinkToken } from './links.js';
import { escapeHtml, legalPage } from './legal.js';
import type { InstagramConnect } from './instagram-connect.js';
import type { SetterBrain } from './setter/brain.js';
import type { DiscardResult, DraftResult, ManualResult } from './setter/service.js';
import type { LeadPlayer } from './setter/simulator.js';
import type { SetterLinks } from './setter/prompt.js';
import type { InstagramConnection } from './workspace-manager.js';
import type { Store } from './store.js';
import { createApiRoutes } from './routes-api.js';
import { createOnboardingApi, createWorkspacesApi, type WorkspacesAdmin } from './routes-api-workspaces.js';
import { createSetterApi } from './routes-api-setter.js';
import { createSetterDocsApi } from './routes-api-setter-docs.js';
import { createConversationsApi } from './routes-api-conversations.js';
import { createContactsApi } from './routes-api-contacts.js';
import { createMetricsApi } from './routes-api-metrics.js';
import { createMediaLoader } from './media-catalog.js';
import { createChatEntryApi } from './routes-api-chat-entry.js';
import { createFlowsApi } from './routes-api-flows.js';
import { createIntelligenceApi } from './routes-api-intelligence.js';
import { createMeApi, createUsersApi } from './routes-api-users.js';
import { createSettingsApi } from './routes-api-settings.js';
import type { Analyzer } from './intelligence/analyzer.js';
import type { UserStore } from './users.js';
import { registerWebApp } from './web.js';

/** Reels recientes que se cargan para poner nombre a los IDs en Contactos (los más antiguos salen por ID). */
const MEDIA_FOR_STATS = 50;
/** Los avisos de Meta son JSON de pocos KB: 1 MB es de sobra. */
const WEBHOOK_MAX_BYTES = 1024 * 1024;

export interface AppDeps {
  readonly config: Config;
  readonly store: Store;
  readonly client: InstagramClient | null;
  readonly tokens: TokenManager;
  /** Clave para verificar los enlaces con seguimiento. null = desactivados. */
  readonly linkSecret: string | null;
  /** Procesa un aviso de Meta en segundo plano. */
  readonly processPayload: (payload: unknown) => void;
  /** Borradores del setter (modo borrador): enviar tal cual o descartar desde la conversación. */
  readonly drafts?: { approve(igId: string): Promise<DraftResult>; discard(igId: string): Promise<DiscardResult> };
  /** Contesta ya si el último mensaje de esa persona está sin responder (al reanudar la IA). */
  readonly replyPending?: (igId: string) => Promise<void>;
  /** Simulador del setter (null = sin ANTHROPIC_API_KEY). */
  readonly simulator?: { readonly brain: SetterBrain; readonly lead: LeadPlayer } | null;
  /** Usuarios del frontend (Fase 6). Sin ellos no hay /api. */
  readonly users?: UserStore;
  /** Responder a mano desde la bandeja (Fase 6.2). */
  readonly conversations?: { sendManual(igId: string, text: string, author: string): Promise<ManualResult> };
  /** Análisis de conversaciones (Fase 6.6). null/ausente si no hay clave de Anthropic. */
  readonly analyzer?: Analyzer | null;
  /** "Conectar Instagram" (prueba antes de la 7.5). */
  readonly instagramConnect?: InstagramConnect | null;
  /** Espacio de esta app (Fase 7.5). null o ausente = el principal. */
  readonly workspace?: { readonly id: string; readonly name: string } | null;
  /** Crear espacios e invitar (Fase 7.5b): solo lo recibe el principal. */
  readonly workspaces?: WorkspacesAdmin;
  /** Enlaces de reserva del setter (7.5c): ausente = los de Render (en el principal); un espacio nuevo, ninguno. */
  readonly setterDefaultLinks?: SetterLinks;
  /** Conectar de verdad el Instagram de otro espacio (7.5c): solo lo recibe el principal (donde vuelve Instagram). */
  readonly connectWorkspace?: (workspaceId: string, connection: InstagramConnection) => Promise<void>;
}

function errorMessage(error: unknown): string {
  if (error instanceof MetaApiError) return `${error.message} (HTTP ${error.status})`;
  return error instanceof Error ? error.message : String(error);
}

function registerWebhook(app: Hono, deps: AppDeps): void {
  const { config, store, processPayload } = deps;

  // Verificación del webhook: Meta llama una vez con hub.challenge al guardar la URL.
  app.get('/webhooks/instagram', (c) => {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    if (mode === 'subscribe' && token === config.webhookVerifyToken) return c.text(c.req.query('hub.challenge') ?? '');
    return c.text('Token de verificación incorrecto', 403);
  });

  // Avisos de Meta: se comprueba la firma, se guardan, se responde 200 rápido y se procesan después.
  // Solo se guarda lo que firma Meta (si no, cualquiera llenaría la base) y nada de más de WEBHOOK_MAX_BYTES.
  const limit = bodyLimit({ maxSize: WEBHOOK_MAX_BYTES, onError: (c) => c.text('Aviso demasiado grande', 413) });
  app.post('/webhooks/instagram', limit, async (c) => {
    const raw = Buffer.from(await c.req.arrayBuffer());
    if (!isValidSignature(raw, c.req.header('x-hub-signature-256'), config.appSecrets)) return c.text('Firma no válida', 403);
    let payload: unknown;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch {
      payload = { invalidJson: raw.toString('utf8').slice(0, 1000) };
    }
    await store.recordRequest(true, payload);
    processPayload(payload);
    return c.text('EVENT_RECEIVED');
  });
}

/** Enlaces con seguimiento: registra el clic, añade etiquetas y redirige al destino real. */
function registerLinks(app: Hono, deps: AppDeps): void {
  app.get('/l/:token', async (c) => {
    const data = deps.linkSecret ? readLinkToken(deps.linkSecret, c.req.param('token')) : null;
    if (!data) return c.text('Enlace no válido', 404);
    try {
      await deps.store.logEvent('click', `Clic en enlace del flujo ${data.f} (paso ${data.n}).`, data);
      await deps.store.addContactTags(data.r, data.t);
    } catch (error) {
      // Si falla el registro, la persona igualmente llega a su destino.
      process.stderr.write(`[setter-ai] No se pudo registrar el clic: ${String(error)}\n`);
    }
    return c.redirect(data.u, 302);
  });
}

/**
 * Vuelta del inicio de sesión de Instagram. Comprueba el state y cambia el código por el token. Si el enlace salió de
 * otro espacio, lo conecta de verdad (token cifrado en su base); en el principal solo informa (prueba).
 */
function registerInstagramCallback(app: Hono, deps: AppDeps): void {
  const page = (title: string, body: string) =>
    `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>` +
    `<body style="font-family:system-ui;background:#0a0a0a;color:#e9e9ec;padding:40px;max-width:560px;margin:auto"><h1>${escapeHtml(title)}</h1>${body}<p><a style="color:#d9ae3e" href="/app/configuracion?tab=instagram">Volver a la web</a></p></body></html>`;
  app.get('/oauth/instagram/callback', async (c) => {
    const connect = deps.instagramConnect;
    if (!connect) return c.html(page('No disponible', '<p>Falta la dirección pública del servidor.</p>'), 503);
    if (c.req.query('error')) {
      const reason = c.req.query('error_description') ?? c.req.query('error') ?? '';
      await deps.store.logEvent('instagram-conectar', `Prueba de conexión cancelada: ${reason}`, { error: c.req.query('error'), reason: c.req.query('error_reason') ?? null });
      return c.html(page('Conexión cancelada', `<p>Instagram dice: ${escapeHtml(reason)}</p>`), 400);
    }
    const state = connect.takeState(c.req.query('state') ?? '');
    if (!state.valid) {
      await deps.store.logEvent('instagram-conectar', 'Prueba de conexión: enlace caducado o ya usado (se pidió otra vez).', null);
      return c.html(page('Enlace caducado', '<p>Vuelve a pulsar "Conectar Instagram" (el enlace dura 10 minutos y vale una vez).</p>'), 400);
    }
    const result = await connect.exchange(c.req.query('code') ?? '');
    if (!result.ok) {
      await deps.store.logEvent('instagram-conectar', `Prueba de conexión FALLIDA: ${result.error}`, null);
      return c.html(page('No se pudo conectar', `<p>Instagram respondió: <strong>${escapeHtml(result.error)}</strong></p>`), 400);
    }
    const { username, userId, permissions, expiresInDays, secretIndex } = result;
    // Fase 7.5c: el enlace salió de otro espacio → se conecta de verdad (token cifrado en SU base). Nunca se enseña.
    if (state.workspaceId !== null && deps.connectWorkspace) {
      try {
        await deps.connectWorkspace(state.workspaceId, { accessToken: result.accessToken, expiresInDays, userId, username });
      } catch (error) {
        await deps.store.logEvent('instagram-conectar', `Conexión de @${username} al espacio ${state.workspaceId} FALLIDA: ${errorMessage(error)}`, { workspaceId: state.workspaceId, username });
        return c.html(page('No se pudo conectar', `<p>${escapeHtml(errorMessage(error))}</p>`), 400);
      }
      await deps.store.logEvent('instagram-conectar', `@${username} conectada al espacio ${state.workspaceId}.`, { workspaceId: state.workspaceId, username, userId, permissions });
      return c.html(page(`Conectado: @${username}`, '<p>Tu cuenta de Instagram ya está conectada y sus avisos (comentarios y mensajes) llegarán a tu espacio.</p>'));
    }
    await deps.store.logEvent('instagram-conectar', `Prueba de conexión OK: @${username}, permisos: ${permissions.join(', ')} (token de ${expiresInDays ?? '?'} días, no guardado).`, {
      username,
      userId,
      permissions,
      expiresInDays,
      secretIndex,
    });
    return c.html(
      page(
        `Conectado: @${username}`,
        `<p>Permisos concedidos: <strong>${escapeHtml(permissions.join(', ') || '(ninguno)')}</strong></p><p>Token de ${expiresInDays ?? '?'} días obtenido. <strong>No se ha guardado</strong> (era una prueba).</p>`,
      ),
    );
  });
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.get('/', (c) => c.text('setter-ai en marcha'));
  app.get('/healthz', (c) => c.json({ ok: true }));
  app.get('/privacy', (c) => c.html(legalPage('privacy')));
  app.get('/terms', (c) => c.html(legalPage('terms')));
  app.get('/data-deletion', (c) => c.html(legalPage('data-deletion')));

  registerWebhook(app, deps);
  registerLinks(app, deps);
  if (deps.users) {
    const api = createApiRoutes({ users: deps.users, setupKey: deps.config.adminPassword, workspace: deps.workspace ?? null });
    // Espacios (Fase 7.5b): solo en el espacio principal.
    if (deps.workspaces) api.route('/workspaces', createWorkspacesApi({ store: deps.store, users: deps.users, admin: deps.workspaces }));
    // Primeros pasos (7.5f): solo en los clientes. Con token hay cliente de Instagram (el espacio se reinicia al conectar).
    if (deps.workspace) api.route('/onboarding', createOnboardingApi({ store: deps.store, users: deps.users, hasInstagram: () => deps.client !== null }));
    api.route('/setter/docs', createSetterDocsApi({ store: deps.store, users: deps.users }));
    api.route('/setter', createSetterApi({ store: deps.store, users: deps.users, config: deps.config, simulator: deps.simulator ?? null, defaultLinks: deps.setterDefaultLinks }));
    // Títulos de reels: los últimos 50 + los más antiguos pedidos por id (se recuerdan mientras el servidor esté en marcha).
    const media = createMediaLoader(deps.client, MEDIA_FOR_STATS);
    api.route('/contacts', createContactsApi({ store: deps.store, users: deps.users, media }));
    api.route('/metrics', createMetricsApi({ store: deps.store, users: deps.users, media }));
    api.route('/flows', createFlowsApi({ store: deps.store, users: deps.users, media, account: async () => (deps.client ? (await deps.client.getAccount()).username : null) }));
    api.route('/chat-entry', createChatEntryApi({ store: deps.store, users: deps.users, client: deps.client }));
    api.route('/users', createUsersApi({ users: deps.users, store: deps.store }));
    api.route('/me', createMeApi({ users: deps.users, store: deps.store }));
    api.route(
      '/settings',
      createSettingsApi({
        store: deps.store,
        users: deps.users,
        config: deps.config,
        client: deps.client,
        tokens: deps.tokens,
        linkTracking: deps.linkSecret !== null,
        connect: deps.instagramConnect ?? null,
        workspaceId: deps.workspace?.id ?? null,
      }),
    );
    api.route('/intelligence', createIntelligenceApi({ store: deps.store, users: deps.users, media, analyzer: deps.analyzer ?? null }));
    api.route(
      '/conversations',
      createConversationsApi({ store: deps.store, users: deps.users, drafts: deps.drafts, replyPending: deps.replyPending, sendManual: deps.conversations?.sendManual }),
    );
    app.route('/api', api);
  }
  registerWebApp(app);
  registerInstagramCallback(app, deps);
  return app;
}
