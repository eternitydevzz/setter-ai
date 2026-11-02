/**
 * Páginas públicas que pide Meta para publicar la app (privacidad, términos y borrado de datos) y el escape de HTML
 * que usan las pocas páginas que pinta el servidor. Cambia los textos para tu negocio antes de publicar la app.
 */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.5}</style>
</head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
}

const LEGAL = {
  privacy: {
    title: 'Política de privacidad',
    body: `<p>Esta aplicación la usa únicamente el titular de la cuenta de Instagram conectada para responder comentarios y mensajes directos que recibe su propia cuenta.</p>
<p>Datos que se tratan: el identificador de Instagram, el nombre de usuario y el texto de los comentarios o mensajes que la persona envía a esta cuenta. Se usan solo para responder y para hacer seguimiento comercial de esas conversaciones.</p>
<p>Los datos no se venden ni se ceden a terceros. Se guardan en una base de datos privada y solo el titular tiene acceso.</p>`,
  },
  terms: {
    title: 'Términos del servicio',
    body: `<p>Esta aplicación es de uso privado del titular de la cuenta de Instagram conectada. No se ofrece como servicio a terceros.</p>
<p>Las respuestas automáticas se envían solo a personas que han comentado o escrito primero a esta cuenta, respetando las normas de Instagram.</p>`,
  },
  'data-deletion': {
    title: 'Borrado de datos',
    body: `<p>Para pedir el borrado de tus datos (identificador, usuario y mensajes), envía un mensaje directo a la cuenta de Instagram con la palabra <strong>BORRAR</strong>.</p>
<p>Los datos se eliminarán en un plazo máximo de 30 días y te lo confirmaremos por el mismo canal.</p>`,
  },
} as const;

export function legalPage(kind: keyof typeof LEGAL): string {
  return page(LEGAL[kind].title, LEGAL[kind].body);
}
