<div align="center">

# 🤖 Setter IA para Instagram

**Responde comentarios, manda DMs con botones y conversa con tus leads con IA — todo desde tu propio servidor.**

Tipo ManyChat + un *setter* con Claude que cualifica y agenda llamadas · Código abierto (MIT) · Proyecto educativo

[Instalación paso a paso](docs/INSTALACION.md) · [Cómo funciona](docs/COMO-FUNCIONA.md) · [Documento de ejemplo](ejemplos/documento-setter.md)

<img src="docs/img/app-inicio.png" alt="Inicio de la app: embudo de los últimos 7 días, comentarios por día, setter y flujos" width="900">

</div>

> Las capturas usan un **negocio inventado** (“Estudio Lumen”, academia de fotografía de producto) y cuentas de ejemplo terminadas en `_demo`.

---

## ✨ Qué hace

```mermaid
flowchart LR
    A["💬 Alguien comenta<br/>en tu reel"] --> B["⚡ Flujo<br/>respuesta pública + DM con botón"]
    B --> C["🎁 Recibe tu recurso<br/>(guía, enlace…)"]
    C --> D["🤖 Setter IA<br/>conversa por DM y cualifica"]
    D --> E["📅 Agenda una llamada<br/>o le ofrece la membresía"]
    D -.-> F["📊 Todo medido<br/>embudo, etapas, clics"]
```

| | |
|---|---|
| ⚡ **Flujos** | Comentario en un reel, palabra clave por DM, respuesta o mención en historia, enlace ig.me. Botones, condiciones (“¿me sigue?”), esperas, etiquetas, carruseles… con un **constructor visual**. |
| 🤖 **Setter con IA** | Claude habla con quien te escribe, como una persona del equipo: hace preguntas, rellena la ficha del lead y le pasa tu agenda. Con modo prueba, borradores y un **simulador**. |
| 📊 **Métricas** | Embudo por reel y por día, tablero de leads por etapa, clics en tu agenda y análisis de objeciones con IA. |
| 🛡️ **Seguro** | Firma de Meta comprobada, token cifrado, límites anti-ban, pausa automática si Meta bloquea y **BORRAR** por DM para borrar los datos de una persona. |

## 📸 Así se ve

| Conversaciones con la IA | Tablero de leads |
|---|---|
| <img src="docs/img/app-conversaciones.png" alt="Conversación con el setter y ficha del lead"> | <img src="docs/img/app-tablero.png" alt="Leads por etapa"> |
| **Constructor visual de flujos** | **Métricas** |
| <img src="docs/img/app-constructor.png" alt="Constructor de flujos con la condición ¿me sigue?"> | <img src="docs/img/app-metricas.png" alt="Embudo por reel"> |
| **Setter IA: modo, enlaces y simulador** | **Contactos** |
| <img src="docs/img/app-setter.png" alt="Ajustes del setter"> | <img src="docs/img/app-contactos.png" alt="Lista de contactos con etapa y etiquetas"> |

## 🧱 Con qué está hecho

```mermaid
flowchart LR
    IG["📱 Instagram"] -- avisos (webhooks) --> S["🖥️ Tu servidor<br/>Node + Hono · Render"]
    S -- respuestas y DMs --> IG
    S <--> DB[("🗄️ Postgres<br/>Neon")]
    S <--> AI["🧠 Claude<br/>API de Anthropic"]
    W["🌐 Web de gestión<br/>React · /app"] <--> S
```

Node 22+ · TypeScript · Hono · React + Vite + Tailwind · Postgres · Claude (Anthropic) · 600+ pruebas automáticas.

## 🚀 Pruébalo en tu ordenador (10 minutos)

Necesitas [Node 22+](https://nodejs.org) y [Docker](https://www.docker.com/) (para la base de datos).

```bash
git clone <URL-de-este-repo> setter-ai && cd setter-ai
npm ci

# Base de datos local (Postgres en Docker)
docker run --name setter-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17

# Variables: copia la plantilla y rellena lo mínimo
cp .env.example .env
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable
#   ADMIN_PASSWORD=una-clave-de-12-o-mas
#   WEBHOOK_VERIFY_TOKEN=cualquier-texto

npm run build   # compila el servidor y la web
npm run dev     # arranca en http://localhost:3000
```

Abre **http://localhost:3000/app**, crea tu cuenta de admin con la `ADMIN_PASSWORD` y ya estás dentro. Para que responda a Instagram de verdad, sigue la **[instalación completa](docs/INSTALACION.md)**.

> 💡 **¿Usas Claude Code?** Cada paso de la instalación trae un **prompt listo para copiar**: Claude te guía, ejecuta los comandos y comprueba que todo funciona.

## 🗺️ Mapa de la documentación

| Documento | Para qué |
|---|---|
| [docs/INSTALACION.md](docs/INSTALACION.md) | De cero a tu Instagram respondiendo solo: Neon, Render, app de Meta, Claude. Con prompts para Claude Code. |
| [docs/COMO-FUNCIONA.md](docs/COMO-FUNCIONA.md) | Diagramas de cada recorrido, estructura del código y decisiones de seguridad. |
| [ejemplos/documento-setter.md](ejemplos/documento-setter.md) | Documento del setter de un negocio inventado, para copiarlo y adaptarlo. |
| [.env.example](.env.example) | Todas las variables, explicadas. |

## ⚠️ Antes de usarlo con gente real

- **Prueba primero en modo Prueba** (Setter IA → Modo): la IA solo contesta a las cuentas que pongas.
- **Respeta las normas de Instagram**: la app solo escribe a quien comenta o te escribe primero, y tiene límites por hora. Aun así, Meta puede restringir una cuenta si hay muchos rechazos.
- **Revisa las páginas legales** (`/privacy`, `/terms`, `/data-deletion` en `src/legal.ts`) y ponles los datos de tu negocio.
- Límites conocidos: ver [docs/COMO-FUNCIONA.md → Límites conocidos](docs/COMO-FUNCIONA.md#-límites-conocidos).

## 📄 Licencia

[MIT](LICENSE): úsalo, cámbialo y aprende con él.
