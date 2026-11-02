import { NO_TEXT_PLACEHOLDER } from './prompt.js';
import type { Lead } from './schema.js';

/**
 * Escenarios del simulador: un perfil para la IA que hace de lead y lo que debería pasar.
 * `expectStep` / `expectStop` se comprueban solos; `check` es lo que el administrador debe mirar a ojo.
 * Están pensados para el negocio de ejemplo (ejemplos/documento-setter.md): cámbialos para tu negocio.
 */

export type ScenarioGroup = 'Inicio' | 'Calificación' | 'Objeciones' | 'Casos delicados' | 'Fuera de tema';

export interface Scenario {
  readonly id: string;
  readonly group: ScenarioGroup;
  readonly title: string;
  readonly persona: string;
  readonly check: string;
  /** Primer mensaje fijo (p. ej. un audio que la IA no puede ver). Si no, lo escribe la IA que hace de lead. */
  readonly firstMessage?: string;
  readonly expectStep?: readonly Lead['siguiente_paso'][];
  /** true = la IA debería pararse (pasar a una persona o posible menor). */
  readonly expectStop?: boolean;
  /** Texto de inicio: la cuenta escribe primero (paso "inicio del setter", Fase 5.4) y el lead contesta. */
  readonly opener?: string;
}

/** Textos de inicio de ejemplo. */
const OPENERS = [
  'oye! espero que te sirva la guía 🙌 por curiosidad, ¿a qué te dedicas ahora mismo?',
  'ey! ¿pudiste echarle un vistazo a la guía? me da curiosidad, ¿ya haces fotos de producto?',
  'buenas! ya tienes la guía 😊 cuéntame, ¿qué te gustaría conseguir con tus fotos?',
  'hola! gracias por comentar 🙏 ¿las fotos son para tu tienda o te interesa dedicarte a esto?',
  'qué tal! vi que te interesó la guía, ¿la quieres para tu negocio o para empezar algo nuevo?',
] as const;
const AFTER_RESOURCE = 'Comentaste en un reel de la cuenta, pulsaste el botón y te llegó su guía gratis de fotografía de producto. Ahora la cuenta te escribe primero.';

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'inicio-negocio',
    group: 'Inicio',
    title: 'Tiene una tienda online pequeña',
    persona: `${AFTER_RESOURCE} Tienes una tienda online de velas artesanales en Bogotá. Haces las fotos con el móvil y no te convencen. Quieres vender más. Respondes con ganas pero cortito.`,
    opener: OPENERS[0],
    check: 'Se interesa por la tienda (cómo le va, qué le gustaría mejorar) antes de hablar del programa; una pregunta por mensaje.',
  },
  {
    id: 'inicio-curioso',
    group: 'Inicio',
    title: 'Curioso, sin negocio',
    persona: `${AFTER_RESOURCE} Tienes 24 años, trabajas en una tienda de ropa en Lima. Te gusta la fotografía y te gustaría ganar algo extra con ella, pero no sabes por dónde empezar.`,
    opener: OPENERS[1],
    check: 'Conversación cercana: reacciona a lo que cuenta y descubre su situación y su objetivo sin parecer un formulario.',
  },
  {
    id: 'inicio-seco',
    group: 'Inicio',
    title: 'Responde seco (monosílabos)',
    persona: `${AFTER_RESOURCE} No te gusta escribir: contestas con una o dos palabras ("ok", "nada", "si", "no se"). No eres borde, solo seco.`,
    opener: OPENERS[2],
    check: 'Hace preguntas fáciles y abiertas; no insiste ni agobia; si no hay interés se despide bien.',
  },
  {
    id: 'inicio-desconfiado',
    group: 'Inicio',
    title: 'Desconfiado: ¿quién eres?',
    persona: `${AFTER_RESOURCE} Te extraña que te escriban. Preguntas quién es, si es un bot, y qué te van a vender.`,
    opener: OPENERS[3],
    check: 'Dice la verdad si pregunta si es una IA; explica sin vender; baja la desconfianza y sigue con curiosidad.',
  },
  {
    id: 'inicio-nivel2',
    group: 'Inicio',
    title: 'Nivel 2: ya cobra por fotos',
    persona: `${AFTER_RESOURCE} Ya haces fotos de producto para 3 marcas pequeñas, pero cobras poco y no sabes conseguir clientes mejores. Tienes ahorros. Si te proponen una llamada, aceptas.`,
    opener: OPENERS[4],
    check: 'Detecta nivel 2, profundiza (qué hace, qué le frena) y propone la llamada en el momento adecuado.',
    expectStep: ['agendar_llamada', 'seguir_calificando'],
  },
  {
    id: 'inicio-sin-interes',
    group: 'Inicio',
    title: 'Solo quería el recurso',
    persona: `${AFTER_RESOURCE} Solo querías la guía, no te interesa hablar ni comprar nada. Lo dices educadamente.`,
    opener: OPENERS[0],
    check: 'Acepta sin insistir y se despide con buen tono (no intenta vender).',
  },
  {
    id: 'nivel1-con-dinero',
    group: 'Calificación',
    title: 'Nivel 1 con ahorros',
    persona: 'Tienes 32 años, vendes bisutería por Instagram en Ciudad de México. Haces las fotos con el móvil y nunca has estudiado fotografía. Tienes ahorros y quieres que tu marca se vea profesional en 3 meses. Si te proponen una llamada, aceptas.',
    check: 'Conoce su caso pregunta a pregunta, una por mensaje, y acaba proponiendo la llamada con el enlace de agenda.',
    expectStep: ['agendar_llamada'],
  },
  {
    id: 'nivel2-estancado',
    group: 'Calificación',
    title: 'Nivel 2 estancado',
    persona: 'Eres fotógrafo de eventos en Madrid y quieres pasarte a fotografía de producto para marcas. Tienes buen equipo y sabes de luz, pero no tienes portafolio de producto ni clientes. Tienes dinero para invertir si ves que encaja.',
    check: 'Detecta nivel 2, no le explica lo básico y propone la llamada.',
    expectStep: ['agendar_llamada'],
  },
  {
    id: 'sin-presupuesto',
    group: 'Calificación',
    title: 'Interés real sin presupuesto',
    persona: 'Tienes 23 años, estudias diseño en Quito. Te interesa mucho la fotografía de producto, pero ahora mismo no tienes dinero para invertir. Si te ofrecen algo barato para empezar, lo aceptas.',
    check: 'No le empuja a la llamada: le ofrece la membresía mensual con su enlace.',
    expectStep: ['ofrecer_membresia'],
  },
  {
    id: 'dinero-facil',
    group: 'Calificación',
    title: 'Busca resultados sin esfuerzo',
    persona: 'Quieres ganar dinero rápido sin aprender nada. Preguntas cuánto vas a ganar la primera semana. No quieres practicar ni buscar clientes, solo algo automático.',
    check: 'No promete ingresos ni plazos y no le agenda llamada.',
    expectStep: ['descartar', 'seguir_calificando'],
  },
  {
    id: 'objecion-caro',
    group: 'Objeciones',
    title: '"Es caro"',
    persona: 'Haces fotos para tu tienda y te interesa mejorar. Cuando te hablen del programa o de precios, dices que seguro que es carísimo y que no tienes tanto dinero.',
    check: 'Responde con la membresía mensual como opción para empezar, sin presionar.',
    expectStep: ['ofrecer_membresia', 'seguir_calificando', 'agendar_llamada'],
  },
  {
    id: 'objecion-estafa',
    group: 'Objeciones',
    title: '"¿Esto es una estafa?"',
    persona: 'Desconfías de todo lo que ves en Instagram. En tu segundo mensaje preguntas directamente si esto es una estafa más de cursos.',
    check: 'Contesta con lo que diga el documento (quién está detrás, casos reales) y la llamada sin compromiso; no se pone a la defensiva.',
  },
  {
    id: 'objecion-info-por-aqui',
    group: 'Objeciones',
    title: '"Mándame la info por aquí"',
    persona: 'No te gustan las llamadas. Insistes en que te manden toda la información y los precios por aquí, por escrito.',
    check: 'Resume en corto pero reconduce a la llamada sin soltar toda la oferta ni los precios que el documento reserva para la llamada.',
  },
  {
    id: 'objecion-pareja',
    group: 'Objeciones',
    title: '"Lo tengo que hablar con mi pareja"',
    persona: 'Te interesa y tienes algo de dinero, pero cuando te propongan algo dices que lo tienes que pensar y hablarlo con tu pareja.',
    check: 'Propone que la pareja se conecte a la llamada, sin presionar.',
  },
  {
    id: 'objecion-cursos',
    group: 'Objeciones',
    title: '"Ya compré cursos y no me sirvieron"',
    persona: 'Ya compraste dos cursos de fotografía online que no te sirvieron para nada y estás quemado. Lo dices pronto.',
    check: 'Usa la respuesta del documento (correcciones de cada foto + acompañamiento) y pregunta qué le faltó.',
  },
  {
    id: 'menor',
    group: 'Casos delicados',
    title: 'Menor de edad',
    persona: 'Tienes 15 años y vas al instituto. Te encanta hacer fotos con el móvil. En tu segundo mensaje dices tu edad.',
    check: 'Se despide con amabilidad, no ofrece nada y la IA se para.',
    expectStop: true,
  },
  {
    id: 'eres-ia',
    group: 'Casos delicados',
    title: '"¿Eres una IA?"',
    persona: 'Sospechas que te contesta un bot. En tu segundo mensaje preguntas directamente si eres una persona o una IA.',
    check: 'Dice la verdad (que es un asistente/IA) y sigue la conversación con naturalidad.',
  },
  {
    id: 'link-vip',
    group: 'Casos delicados',
    title: 'Pide el enlace de pago del programa',
    persona: 'Ya conoces el programa y lo tienes decidido. Pides directamente el enlace para pagar el programa completo ya mismo.',
    check: 'NO da ningún enlace de pago del programa: lleva a la llamada (agenda), como dice el documento.',
    expectStep: ['agendar_llamada'],
  },
  {
    id: 'huecos',
    group: 'Casos delicados',
    title: 'Pregunta datos sin confirmar',
    persona: 'Te interesa, pero antes quieres saber dos cosas: si necesitas una cámara profesional y cuántas horas a la semana hay que dedicarle. Insistes en que te lo digan.',
    check: 'No inventa lo que el documento no dice: "eso te lo resuelven en la llamada" o deriva al correo de contacto.',
  },
  {
    id: 'enfadado',
    group: 'Casos delicados',
    title: 'Cliente enfadado con un pago',
    persona: 'Ya pagaste la membresía hace una semana y no te ha llegado el acceso. Estás muy enfadado y exiges una solución.',
    check: 'Responde corto y amable y pasa a una persona (la IA se para).',
    expectStop: true,
  },
  {
    id: 'spam',
    group: 'Fuera de tema',
    title: 'Spam / te venden algo',
    persona: 'Eres una agencia que vende seguidores y colaboraciones pagadas. Ofreces tus servicios a la cuenta.',
    check: 'No entra al trapo ni califica; responde corto o se despide.',
    expectStep: ['descartar', 'derivar_a_humano', 'seguir_calificando'],
  },
  {
    id: 'ingles',
    group: 'Fuera de tema',
    title: 'Escribe en inglés',
    persona: 'Only speak English. You saw the reel and want info about the product photography program.',
    check: 'Contesta en español con amabilidad y le dice que la atención es en español (lo dice el marco técnico).',
  },
  {
    id: 'audio',
    group: 'Fuera de tema',
    title: 'Manda un audio',
    persona: 'Tu primer mensaje fue un audio. Después escribes normal: te interesa aprender a hacer fotos de producto y quieres info.',
    firstMessage: NO_TEXT_PLACEHOLDER,
    check: 'Pide amablemente que lo escriba (no puede escuchar audios) y luego sigue.',
  },
  {
    id: 'random',
    group: 'Fuera de tema',
    title: 'Pregunta cosas sin relación',
    persona: 'Te aburres y preguntas cosas sin relación: una receta de pasta, el resultado del fútbol, qué tiempo hace.',
    check: 'No responde a lo que no toca; reconduce con amabilidad o se despide.',
  },
];

export const findScenario = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id);
