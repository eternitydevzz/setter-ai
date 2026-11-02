import { Bot, BrainCircuit, Columns3, Contact, LayoutGrid, MessagesSquare, Settings, TrendingUp, Workflow, type LucideIcon } from 'lucide-react';
import type { Role } from '../lib/api';

export interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Quién lo ve (decisión de diseño: el equipo no toca el setter, los flujos ni la configuración). */
  readonly roles: readonly Role[];
  readonly description: string;
}

const ALL: readonly Role[] = ['admin', 'team'];
const ADMIN: readonly Role[] = ['admin'];

export const NAV: readonly NavItem[] = [
  { path: '/', label: 'Inicio', icon: LayoutGrid, roles: ALL, description: 'Resumen y accesos.' },
  { path: '/setter', label: 'Setter IA', icon: Bot, roles: ADMIN, description: 'Documento, marco técnico, textos de inicio, modo y simulador.' },
  { path: '/conversaciones', label: 'Conversaciones', icon: MessagesSquare, roles: ALL, description: 'Bandeja, fichas, pausar la IA, borradores y responder a mano.' },
  { path: '/tablero', label: 'Tablero', icon: Columns3, roles: ALL, description: 'Cada lead en su etapa, de un vistazo.' },
  { path: '/contactos', label: 'Contactos', icon: Contact, roles: ALL, description: 'Fichas, etiquetas, reel de origen e historial.' },
  { path: '/metricas', label: 'Métricas', icon: TrendingUp, roles: ALL, description: 'Embudo por reel y por día, setter y agenda.' },
  { path: '/flujos', label: 'Flujos', icon: Workflow, roles: ADMIN, description: 'Constructor visual: disparadores, mensajes, botones, condiciones y pausas.' },
  { path: '/inteligencia', label: 'Inteligencia', icon: BrainCircuit, roles: ADMIN, description: 'Objeciones, datos de mercado y ángulos de contenido.' },
  { path: '/configuracion', label: 'Configuración', icon: Settings, roles: ADMIN, description: 'Usuarios, cuenta de Instagram, token y límites.' },
];

export function navFor(role: Role): readonly NavItem[] {
  return NAV.filter((item) => item.roles.includes(role));
}
