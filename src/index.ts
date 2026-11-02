import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';
import { databaseSslFor, loadConfig } from './config.js';
import { InstagramConnect } from './instagram-connect.js';
import { deriveLinkSecret } from './links.js';
import { InstagramClient } from './meta/client.js';
import { createRouter } from './router.js';
import { createPostgresStore } from './store.js';
import { createPostgresUserStore } from './users.js';
import { WorkspaceManager } from './workspace-manager.js';
import { startWorkspaceRuntime } from './workspace-runtime.js';
import { createPostgresWorkspaceRegistry, databaseUrlFor } from './workspaces.js';

/** Conexiones a la base de cada espacio nuevo (el principal sigue con las de siempre). */
const WORKSPACE_DB_CONNECTIONS = 2;

/**
 * Arranque (Fase 7.5a): primero el espacio principal (exactamente igual que antes), luego los demás espacios
 * guardados, cada uno con su base; un solo servidor reparte peticiones y avisos de Meta entre ellos (router.ts).
 */
async function main(): Promise<void> {
  const config = loadConfig();
  // SSL salvo con sslmode=disable en DATABASE_URL (Postgres local).
  const db = { ssl: databaseSslFor(config.databaseUrl) };
  const users = await createPostgresUserStore(config.databaseUrl, db);
  const registry = await createPostgresWorkspaceRegistry(config.databaseUrl, db);
  const anthropic = config.setter.anthropicApiKey ? new Anthropic({ apiKey: config.setter.anthropicApiKey }) : null;
  // Enlaces con seguimiento: necesitan URL pública + clave. Si falta algo, los botones llevan la URL real.
  const linkSecret = config.tokenEncryptionKey ? deriveLinkSecret(config.tokenEncryptionKey) : null;

  // "Conectar Instagram": uno solo para todos los espacios (la vuelta llega siempre al principal y tiene que reconocer
  // el enlace salga del espacio que salga). El ID de la app de Instagram es público (va en el enlace).
  // Sin INSTAGRAM_APP_ID (panel de Meta → tu app → Instagram) no hay botón de "Conectar Instagram".
  const instagramAppId = process.env.INSTAGRAM_APP_ID?.trim() || null;
  const instagramConnect =
    config.publicBaseUrl && instagramAppId
      ? new InstagramConnect({
          appId: instagramAppId,
          appSecrets: config.appSecrets,
          redirectUri: `${config.publicBaseUrl.replace(/\/$/, '')}/oauth/instagram/callback`,
          apiVersion: config.igApiVersion,
        })
      : null;

  // El principal reparte los avisos de Meta entre espacios; el gestor existe justo después (se enlaza aquí).
  let manager: WorkspaceManager | null = null;
  const principal = await startWorkspaceRuntime({
    config,
    workspaceId: null,
    store: await createPostgresStore(config.databaseUrl, db),
    users,
    anthropic,
    envToken: config.igAccessToken,
    linkSecret,
    webhookPayload: (payload) => (manager ? manager.dispatchWebhook(payload) : principal.process(payload)),
    // Crear espacios e invitar (7.5b): solo desde el principal. El gestor existe justo después.
    workspaces: {
      users,
      list: () => (manager ? manager.list() : Promise.resolve([])),
      create: (name) => {
        if (!manager) throw new Error('Los espacios aún están arrancando');
        return manager.create(name);
      },
      // Envíos de cada espacio: nacen bloqueados y solo el administrador los activa (20-10).
      sendsLocked: async (id) => (manager ? manager.sendsLocked(id) : null),
      progress: async (id) => (manager ? manager.progress(id) : null),
      setSendsLock: (id, locked, who) => {
        if (!manager) throw new Error('Los espacios aún están arrancando');
        return manager.setSendsLock(id, locked, who);
      },
      remove: (id) => {
        if (!manager) throw new Error('Los espacios aún están arrancando');
        return manager.remove(id);
      },
    },
    instagramConnect,
    // Conectar de verdad el Instagram de otro espacio (7.5c): la vuelta de Instagram llega aquí.
    connectWorkspace: (workspaceId, connection) => {
      if (!manager) throw new Error('Los espacios aún están arrancando');
      return manager.connectInstagram(workspaceId, connection);
    },
  });

  manager = new WorkspaceManager({
    registry,
    principal,
    provision: (workspaceId) => registry.provision(workspaceId),
    dropDatabase: (workspaceId) => registry.dropDatabase(workspaceId),
    start: async (workspace) =>
      startWorkspaceRuntime({
        config,
        workspaceId: workspace.id,
        store: await createPostgresStore(databaseUrlFor(config.databaseUrl, workspace.id), { ...db, maxConnections: WORKSPACE_DB_CONNECTIONS }),
        users,
        anthropic,
        envToken: null,
        linkSecret,
        workspace: { id: workspace.id, name: workspace.name },
        instagramConnect,
      }),
    // Avisos de Meta de la cuenta recién conectada (comentarios y mensajes, como los del principal).
    subscribe: async (accessToken) => {
      await new InstagramClient(accessToken, config.igApiVersion).subscribe();
    },
    principalAccountId: () => principal.accountId(),
    log: (message) => {
      process.stderr.write(`[setter-ai] ${message}\n`);
      principal.store.logEvent('espacios', message, null).catch(() => undefined);
    },
  });
  const activeManager = manager;
  await activeManager.boot();

  const router = createRouter({ users, manager: activeManager, linkSecret });
  const server = serve({ fetch: router.fetch, port: config.port }, (info) => {
    process.stdout.write(`[setter-ai] Escuchando en el puerto ${info.port}\n`);
  });

  const shutdown = () => {
    server.close();
    Promise.all([activeManager.closeAll(), principal.close()])
      .then(() => Promise.all([users.close(), registry.close()]))
      .finally(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error: unknown) => {
  process.stderr.write(`[setter-ai] No se pudo arrancar: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
