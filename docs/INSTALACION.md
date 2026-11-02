# 🛠️ Instalación paso a paso

[← Volver al README](../README.md) · [Cómo funciona](COMO-FUNCIONA.md)

De cero a tu Instagram respondiendo solo. Cada paso trae un **prompt para Claude Code**: ábrelo en la carpeta del proyecto (`claude`), copia el prompt y Claude te guía, ejecuta lo que haga falta y **comprueba** que el paso quedó bien.

```mermaid
flowchart LR
    A["0 · Cuentas"] --> B["1 · Tu copia<br/>del repo"] --> C["2 · Probar<br/>en local"] --> D["3 · Base de datos<br/>Neon"] --> E["4 · Servidor<br/>Render"]
    E --> F["5 · App de Meta<br/>Instagram"] --> G["6 · Variables<br/>en Render"] --> H["7 · Primer<br/>arranque"] --> I["8 · Setter IA"] --> J["9 · Primer flujo<br/>y prueba real"]
```

> 🔒 **Regla de oro:** las claves (tokens, contraseñas, App Secret, API keys) van **solo** en tu archivo `.env` o en Render. **Nunca** las pegues en el chat ni las subas a GitHub. Los prompts piden a Claude que tampoco las muestre.

---

## 0 · Lo que necesitas

| | Para qué | Coste |
|---|---|---|
| 📱 Cuenta de **Instagram profesional** (empresa o creador) | La API de Instagram solo funciona con cuentas profesionales | Gratis |
| 🧑‍💻 Cuenta en **[Meta for Developers](https://developers.facebook.com/)** | Crear tu app de Instagram | Gratis |
| 🐙 Cuenta en **[GitHub](https://github.com/)** | Tu copia del código | Gratis |
| 🗄️ Cuenta en **[Neon](https://neon.com/)** | La base de datos (Postgres) | Tiene plan gratis |
| 🖥️ Cuenta en **[Render](https://render.com/)** | El servidor, encendido 24/7 | `render.yaml` usa el plan **Starter** (de pago). Consulta el precio actual en Render |
| 🧠 API key de **[Anthropic](https://console.anthropic.com/)** | El setter con IA | Pago por uso (céntimos por conversación) |
| 💻 **Node 22+**, **git** y **Docker** en tu ordenador | Probar en local | Gratis |

> ℹ️ ¿Por qué no el plan gratis de Render? Los servicios gratis se “duermen” cuando no hay tráfico y los avisos de Meta pueden llegar mientras despiertan. Compruébalo en la documentación de Render antes de decidir.

**🤖 Prompt para Claude Code**

```text
Voy a instalar el proyecto setter-ai (lee README.md y docs/INSTALACION.md).
Paso 0: comprueba en mi ordenador que tengo Node 22 o superior, git y Docker funcionando
(ejecuta los comandos de versión y, para Docker, `docker info`). Si falta algo, dime exactamente
cómo instalarlo en mi sistema operativo y espera a que te confirme. Después dame una lista
de las cuentas que necesito (tabla del paso 0) para ir marcándolas.
```

---

## 1 · Tu copia del repo

1. En GitHub, pulsa **Fork** (arriba a la derecha) para tener tu propia copia.
2. Clónala en tu ordenador: `git clone https://github.com/TU-USUARIO/setter-ai.git`

**🤖 Prompt para Claude Code**

```text
Paso 1: estoy en la carpeta de mi fork de setter-ai. Ejecuta `npm ci` y después
`npm test` y `npm run typecheck`. Dime cuántas pruebas pasan. Si algo falla, explícame
por qué en palabras sencillas antes de tocar nada.
```

---

## 2 · Pruébalo en tu ordenador

```bash
docker run --name setter-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
cp .env.example .env
# En .env pon como mínimo:
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable
#   ADMIN_PASSWORD=una-clave-de-12-o-mas
#   WEBHOOK_VERIFY_TOKEN=cualquier-texto
npm run build
npm run dev
```

Abre **http://localhost:3000/app** y crea tu cuenta de admin (te pide la `ADMIN_PASSWORD`).

<img src="img/app-inicio.png" alt="La web en local" width="700">

**🤖 Prompt para Claude Code**

```text
Paso 2: quiero arrancar setter-ai en local con Postgres en Docker, siguiendo el paso 2 de
docs/INSTALACION.md. Arranca el contenedor si no existe, crea mi .env a partir de .env.example
con DATABASE_URL local (sslmode=disable), una ADMIN_PASSWORD aleatoria de 20 caracteres y un
WEBHOOK_VERIFY_TOKEN aleatorio (no me muestres los valores en el chat; dime que están en .env).
Compila con `npm run build`, arranca `npm run dev` en segundo plano y comprueba que
http://localhost:3000/healthz responde {"ok":true}. Dime cómo ver la ADMIN_PASSWORD en mi .env
para crear mi cuenta en http://localhost:3000/app.
```

> 💡 En local Instagram no te puede avisar (necesita una dirección pública). Para eso está Render, a partir del paso 4.

---

## 3 · Base de datos en Neon

1. Entra en **[console.neon.tech](https://console.neon.tech/)** y crea un proyecto (región cercana a tu servidor de Render).
2. Pulsa **Connect** y copia la **connection string** (empieza por `postgresql://` y acaba en `sslmode=require`).
3. Guárdala: será tu `DATABASE_URL` en Render.

<img src="img/neon-connect.png" alt="Neon: ventana Connect con la connection string (contraseña oculta)" width="700">

**🤖 Prompt para Claude Code**

```text
Paso 3: ya tengo mi connection string de Neon. No la pegues en el chat: la he puesto en una línea
DATABASE_URL_NEON= de mi .env. Comprueba SIN MOSTRARLA que empieza por postgresql:// y que lleva
sslmode=require, y prueba la conexión con un script de Node de una línea que use la librería
`postgres` del proyecto (SELECT 1). Dime solo si conecta o el error, sin enseñar la contraseña.
```

---

## 4 · Servidor en Render

1. En **[dashboard.render.com](https://dashboard.render.com/)**: **New → Blueprint** y conecta tu fork de GitHub.
2. Render lee `render.yaml` y crea el servicio `setter-ai`. `WEBHOOK_VERIFY_TOKEN` y `TOKEN_ENCRYPTION_KEY` se generan solos.
3. Rellena las variables que te pide (las demás las completarás en el paso 6): `DATABASE_URL` (Neon) y `ADMIN_PASSWORD`.
4. Espera al despliegue y abre `https://TU-SERVICIO.onrender.com/healthz` → `{"ok":true}`.

<img src="img/render-blueprint.png" alt="Render: crear un Blueprint desde el repo" width="700">

**🤖 Prompt para Claude Code**

```text
Paso 4: voy a desplegar setter-ai en Render con el Blueprint (render.yaml). Explícame qué hace cada
línea de render.yaml en palabras sencillas y qué variables me va a pedir Render. Cuando te diga la
URL de mi servicio, comprueba con curl que /healthz responde {"ok":true} y que /app carga.
Si falla, dime qué mirar en los logs de Render.
```

---

## 5 · Tu app de Meta (Instagram)

Aquí creas la “app” que da permiso a tu servidor para leer comentarios y mandar mensajes de **tu** cuenta. Sigue la guía oficial **[Instagram API con inicio de sesión de Instagram](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)**:

1. **[developers.facebook.com/apps](https://developers.facebook.com/apps)** → **Crear app**, con el caso de uso de **Instagram** (gestionar mensajes y contenido).
2. En el producto **Instagram → configuración de la API con inicio de sesión de Instagram**:
   - Copia el **ID de la app de Instagram** → `INSTAGRAM_APP_ID`.
   - Copia la **clave secreta de la app de Instagram** → `META_APP_SECRET`.
   - **Añade tu cuenta de Instagram** y **genera el token de acceso** → `IG_ACCESS_TOKEN`.
3. **Webhooks**: URL de devolución `https://TU-SERVICIO.onrender.com/webhooks/instagram` y como token de verificación el valor de `WEBHOOK_VERIFY_TOKEN` de Render. Suscríbete a los campos de comentarios y mensajes.
4. Permisos que usa la app: `instagram_business_basic`, `instagram_business_manage_messages`, `instagram_business_manage_comments`.

<img src="img/meta-instagram-api.png" alt="Meta: configuración de la API de Instagram (datos ocultos)" width="700">
<img src="img/meta-webhooks.png" alt="Meta: configuración de webhooks" width="700">

> 🔒 Si tu cuenta de Instagram tiene un rol en la app (administrador o evaluador), no necesitas pasar la revisión de Meta para usarla con **tu propia** cuenta.

**🤖 Prompt para Claude Code**

```text
Paso 5: voy a crear mi app de Meta para setter-ai. Lee la guía oficial
https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/
y la sección de webhooks, y guíame pantalla a pantalla, UN paso cada vez, esperando a que te
confirme antes de seguir. Al terminar debo tener: INSTAGRAM_APP_ID, META_APP_SECRET e
IG_ACCESS_TOKEN (los pondré yo en Render, no los pegues en el chat), y los webhooks apuntando a
https://MI-SERVICIO.onrender.com/webhooks/instagram con el WEBHOOK_VERIFY_TOKEN de Render.
Antes de verificar el webhook, comprueba tú con curl que
/webhooks/instagram?hub.mode=subscribe&hub.verify_token=EL-TOKEN&hub.challenge=123 devuelve 123
(te diré el token por un archivo local, no por el chat).
```

---

## 6 · Variables en Render

En Render → tu servicio → **Environment**, añade: `META_APP_SECRET`, `IG_ACCESS_TOKEN`, `INSTAGRAM_APP_ID` y `ANTHROPIC_API_KEY`. Guarda: Render vuelve a desplegar solo.

<img src="img/render-environment.png" alt="Render: variables de entorno (valores ocultos)" width="700">

Todas las variables, explicadas: **[.env.example](../.env.example)**.

**🤖 Prompt para Claude Code**

```text
Paso 6: repasa conmigo .env.example y dime, una a una, qué variables tengo que tener en Render
para setter-ai y cuáles son opcionales. Después, cuando Render termine de desplegar, comprueba con
curl que /healthz responde y explícame cómo ver en la web (Configuración → Instagram y envíos)
si el token de Instagram funciona.
```

---

## 7 · Primer arranque

1. Abre `https://TU-SERVICIO.onrender.com/app` y crea tu cuenta de admin con la `ADMIN_PASSWORD`.
2. **Configuración → Instagram y envíos**: comprueba que sale tu cuenta y pulsa **Volver a suscribir los avisos de Meta** (suscribe `comments` y `messages`).

<img src="img/app-configuracion.png" alt="Configuración de la web" width="700">

**🤖 Prompt para Claude Code**

```text
Paso 7: ya entré en la web de setter-ai. Explícame qué significa cada dato de
Configuración → Instagram y envíos (token, caducidad, límites por hora, pausa, bloqueo) mirando
src/routes-api-settings.ts y web/src/settings/InstagramTab.tsx, y qué hacer si sale un error.
```

---

## 8 · El setter con IA

1. **Setter IA → Documentos**: pega el [documento de ejemplo](../ejemplos/documento-setter.md) para probar, y luego cámbialo por el de tu negocio.
2. **Setter IA → Modo → Tus enlaces**: tu agenda, tu enlace de pago (membresía) y tu correo.
3. **Modo Prueba** y en *Usuarios de prueba* pon una cuenta tuya de pruebas.
4. **Simulador**: elige un escenario y mira cómo contestaría (cuesta céntimos).

<img src="img/app-setter.png" alt="Setter IA: modo, enlaces y usuarios de prueba" width="700">

**🤖 Prompt para Claude Code**

```text
Paso 8: ayúdame a escribir el documento del setter de MI negocio a partir de
ejemplos/documento-setter.md. Hazme las preguntas que necesites (una cada vez) sobre mi cliente
ideal, mi oferta y precios, objeciones, tono y lo que nunca debe decir. Al final dame el documento
completo en el mismo formato para pegarlo en Setter IA → Documentos. No inventes datos: lo que no
sepa, márcalo como [COMPLETAR].
```

---

## 9 · Tu primer flujo y la prueba real

1. **Flujos → Crear flujo** con la plantilla **Recurso por comentario**.
2. Cambia los textos y el enlace del recurso, y **Activar** (te pide escribir ACTIVAR).
3. Desde **otra** cuenta de Instagram, comenta en uno de tus reels.
4. Mira **Conversaciones**, **Contactos** y **Configuración → Registro**.

<img src="img/app-constructor.png" alt="Constructor de flujos" width="700">

**🤖 Prompt para Claude Code**

```text
Paso 9: hice la prueba real comentando desde otra cuenta. Te pego lo que veo en
Configuración → Registro (sin datos personales). Explícame qué pasó en cada evento mirando
src/process.ts y src/sender.ts, y si algo falló, por qué y cómo arreglarlo.
```

---

## 🆘 Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Meta no verifica el webhook | El token no coincide o la URL está mal | Comprueba `WEBHOOK_VERIFY_TOKEN` en Render y la URL `…/webhooks/instagram` |
| Registro: “Firma no válida” | `META_APP_SECRET` no es el de la app de Instagram | Copia la clave secreta de la **app de Instagram** (prueba `META_APP_SECRET_ALT` con la de Facebook) |
| No responde a comentarios | Flujo inactivo, en modo prueba o sin avisos suscritos | Activa el flujo, revisa *usuarios de prueba* y pulsa **Volver a suscribir los avisos de Meta** |
| “Falta el token de Instagram” | `IG_ACCESS_TOKEN` vacío o caducado | Genera otro en Meta y ponlo en Render |
| El setter no contesta | Modo apagado, sin enlaces, sin documento o sin `ANTHROPIC_API_KEY` | Mira **Configuración → Registro**: dice el motivo exacto |
| Envíos pausados 24 h | Meta devolvió el error 368 (bloqueo por política) | Espera; revisa el estado de tu cuenta en Instagram antes de reanudar |
| Algunos no reciben el DM | Meta no deja escribir a esa persona (error 2534025) | Normal; activa el *plan B* del flujo (respuesta pública pidiendo que te escriba) |

**🤖 Prompt para Claude Code (comodín)**

```text
Tengo este problema con setter-ai: [DESCRÍBELO]. Lee docs/INSTALACION.md y docs/COMO-FUNCIONA.md,
busca en el código dónde se produce y dime la causa más probable y cómo comprobarla, paso a paso.
No cambies código sin preguntarme.
```
