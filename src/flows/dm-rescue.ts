import type { InstagramEvent } from '../meta/parse.js';
import type { Store } from '../store.js';
import { planNode, type Plan } from './engine.js';
import { findNode } from './types.js';
import { sentFlowStep } from './text-reply.js';

/**
 * Rescate por DM (plan B, decisión de diseño): si Meta rechazó el DM al comentario de esta persona
 * (error 2534025: le pasa a parte de la gente) y en los 7 días siguientes nos escribe, el flujo le manda su
 * primer mensaje. Ahora sí se puede: es ella quien ha escrito. Una sola vez por DM fallido (las acciones
 * llevan su clave y el emisor no repite claves). Si desde el fallo ya le mandamos algo, no se rescata.
 */

/** Mismo plazo que Meta da para responder a un comentario. */
const RESCUE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_MESSAGES = 20;

type MessageEvent = Extract<InstagramEvent, { kind: 'message' }>;

type RescueStore = Pick<Store, 'failedPrivateReply' | 'listMessages' | 'listFlows'>;

export async function planDmRescue(event: MessageEvent, store: RescueStore, now: Date = new Date()): Promise<Plan | null> {
  return planDmRescueFor(event.senderId, store, now);
}

/** Meta solo deja contestar dentro de las 24 h desde el último mensaje de la persona. */
async function planDmRescueFor(igId: string, store: RescueStore, now: Date): Promise<Plan | null> {
  const failed = await store.failedPrivateReply(igId, new Date(now.getTime() - RESCUE_WINDOW_MS));
  if (!failed) return null;
  const recent = await store.listMessages(igId, RECENT_MESSAGES);
  if (recent.some((message) => message.direction === 'out' && message.createdAt >= failed.createdAt)) return null;
  const step = sentFlowStep(failed.request);
  if (!step) return null;
  const flow = (await store.listFlows()).find((candidate) => candidate.id === step.flowId);
  if (!flow?.enabled || !findNode(flow, step.nodeId)) return null;
  const actions = planNode(flow, step.nodeId, igId, `rescate-dm:${failed.dedupKey}`);
  if (actions.length === 0) return null;
  return { actions, note: `Flujo "${flow.name}": rescate por DM (su DM al comentario no salió) → paso ${step.nodeId}.`, flowId: flow.id };
}
