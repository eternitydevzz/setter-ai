import { z } from 'zod';

/**
 * Lo que devuelve Claude en cada turno: la respuesta para la persona y la ficha del lead.
 * Sin límites de longitud en el esquema (la API no los admite): la longitud la controla guards.ts.
 */

const UNKNOWN = 'desconocido';

export const LeadSchema = z.object({
  dedicacion: z.string().nullable().describe('A qué se dedica, resumido con sus palabras. null si aún no lo ha dicho.'),
  ubicacion: z.string().nullable().describe('Desde dónde vive o trabaja (nunca lo preguntes junto con a qué se dedica). null si aún no lo ha dicho.'),
  situacion: z.string().nullable().describe('Su punto de partida: qué hace hoy, qué ha probado y qué le frena. null si aún no lo ha dicho.'),
  objetivo: z.string().nullable().describe('Qué quiere conseguir y para cuándo. null si aún no lo ha dicho.'),
  puede_invertir: z.enum(['si', 'no', 'duda', UNKNOWN]).describe('Si está en posición de invertir ahora.'),
  nivel: z.enum(['nivel_1', 'nivel_2', 'no_encaja', UNKNOWN]).describe('Nivel según el perfil ideal del documento.'),
  es_menor: z.enum(['si', 'no', UNKNOWN]).describe('Si hay señales de que es menor de edad.'),
  siguiente_paso: z
    .enum(['seguir_calificando', 'agendar_llamada', 'ofrecer_membresia', 'descartar', 'derivar_a_humano'])
    .describe('Qué toca ahora según la decisión del documento.'),
  tipo_lead: z
    .enum(['aprender', 'empresa', UNKNOWN])
    .describe('aprender = quiere aprender o formarse; empresa = negocio que quiere que se lo hagan (servicio "hecho para ti").'),
  objeciones: z.array(z.string()).describe('Objeciones que ha puesto, con sus palabras. Lista vacía si ninguna.'),
  resumen: z.string().describe('Resumen de 1-2 frases de quién es y en qué punto está.'),
});

export const SetterOutputSchema = z.object({
  messages: z
    .array(z.string())
    .describe('Mensajitos para la persona, en orden, como los mandaría alguien por chat: de 1 a 4, cada uno de 1-2 frases cortas. Lista vacía solo si no se debe responder.'),
  needs_human: z.boolean().describe('true si una persona tiene que intervenir en esta conversación.'),
  needs_human_reason: z.string().nullable().describe('Por qué tiene que intervenir una persona. null si needs_human es false.'),
  lead: LeadSchema,
});

export type Lead = z.infer<typeof LeadSchema>;
export type SetterOutput = z.infer<typeof SetterOutputSchema>;
