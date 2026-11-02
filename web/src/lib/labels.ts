/**
 * Nombres legibles (sistema de diseño §5: nunca enseñar claves internas). Ficha del lead = src/setter/schema.ts.
 */

export const LEAD_FIELD_LABEL: Readonly<Record<string, string>> = {
  siguiente_paso: 'Siguiente paso',
  nivel: 'Nivel',
  tipo_lead: 'Tipo de lead',
  puede_invertir: '¿Puede invertir?',
  resumen: 'Resumen',
  objeciones: 'Objeciones',
  dedicacion: 'A qué se dedica',
  ubicacion: 'Desde dónde',
  situacion: 'Situación',
  objetivo: 'Objetivo',
  es_menor: '¿Menor de edad?',
};

export const VALUE_LABEL: Readonly<Record<string, string>> = {
  aprender: 'Quiere aprender',
  empresa: 'Empresa (hecho para ti)',
  nivel_1: 'Nivel 1',
  nivel_2: 'Nivel 2',
  no_encaja: 'No encaja',
  si: 'Sí',
  no: 'No',
  duda: 'Duda',
  desconocido: 'Sin saber',
  seguir_calificando: 'Calificando',
  agendar_llamada: 'Agendar',
  ofrecer_membresia: 'Membresía',
  descartar: 'Descartado',
  derivar_a_humano: 'Pasar a una persona',
};

export const fieldLabel = (key: string): string => LEAD_FIELD_LABEL[key] ?? key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function valueLabel(value: unknown): string {
  if (Array.isArray(value)) return value.map(valueLabel).join(' · ');
  const text = String(value);
  return VALUE_LABEL[text] ?? text;
}

/** "claude-haiku-5-5" → "Claude Haiku 5.5". */
export function modelLabel(model: string): string {
  const match = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(model);
  if (!match) return model;
  const [, family = '', major, minor] = match;
  return `Claude ${family.charAt(0).toUpperCase()}${family.slice(1)} ${major}.${minor}`;
}
