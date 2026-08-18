# Barzol Web

Catálogo web de Barzol 3D Industry S.A.C.: home, catálogo de productos por categoría, ficha de producto, galería, y panel de administración. Construido con Astro + React (islas) + Tailwind, desplegado en Cloudflare Pages.

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para la estructura de carpetas, convenciones y decisiones técnicas.

## Requisitos

- Node.js >= 22.12.0
- npm

## Instalación

```bash
npm install
```

Copia el archivo de variables de entorno de ejemplo y complétalo con tus credenciales:

```bash
cp .env.example .env
```

## Levantar el proyecto (desarrollo)

```bash
npm run dev
```

Abre `http://localhost:4321`.

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo con recarga en caliente |
| `npm run build` | Genera el build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción localmente para probarlo antes de desplegar |
| `npm run astro` | Acceso directo al CLI de Astro (`npm run astro -- <comando>`) |
| `npm run check` | Chequeo de tipos con `astro check` |
| `npm run generate-types` | Genera los tipos de bindings de Cloudflare (`wrangler types`) |

## Despliegue

Se despliega como **Worker de Cloudflare con assets estáticos** (`wrangler deploy`), usando el adaptador `@astrojs/cloudflare` con `output: 'server'`. No es Cloudflare Pages: la distinción importa porque cambia dónde se configuran las variables en el panel.

> **Un build verde no significa un sitio funcionando.** Las variables de entorno son de *runtime*: si faltan, el despliegue sale correcto y el sitio responde 500 en todas las rutas. Es el fallo más probable de un primer deploy.

Las variables **públicas** (`BARZOL_SUPABASE_URL`, `BARZOL_R2_PUBLIC_URL`) ya están declaradas en `wrangler.jsonc` → `vars`, así que las establece el propio despliegue y no hay que cargar nada a mano. Las **secretas** se cargan una sola vez con el script de la sección siguiente. `BARZOL_R2_PUBLIC_URL` es tan obligatoria como las de Supabase: sin ella la subida funciona pero falla al construir la URL de la imagen.

`BARZOL_SUPABASE_SERVICE_ROLE_KEY` va siempre como **Secret**, nunca como variable en texto plano — salta las políticas RLS.

El contenido multimedia vive en **Cloudflare R2** (bucket `barzol-web`), enlazado como binding `MEDIA` en `wrangler.jsonc`. Al estar hosting y storage en la misma plataforma, la escritura no usa credenciales: el acceso lo concede el binding. Ver ARCHITECTURE.md § Storage de multimedia.

Tras cambiar bindings en `wrangler.jsonc`, correr `npm run generate-types` y commitear `worker-configuration.d.ts`.

### Cargar los secretos en Cloudflare

Las variables **públicas** se declaran en `wrangler.jsonc` → `vars` y las establece el propio despliegue. Las **secretas** se cargan aparte, una sola vez:

```bash
npx wrangler login                  # una vez por máquina
node scripts/subir-secretos.mjs     # lee .env y sube sólo las secretas
npx wrangler secret list            # confirma
```

El script no imprime los valores ni los pasa por la línea de comandos —donde quedarían en el historial del shell—: los entrega por stdin. Se prefiere a cargarlos desde el panel porque ahí el campo recorta los nombres largos y no hay forma de auditar qué quedó guardado.

Para comprobar qué recibió el worker, sin exponer ningún valor:

```bash
curl https://barzol-web.willymichael-cardenas.workers.dev/api/diagnostico
```

El campo `clavesRecibidas` lista los **nombres** de las variables que llegaron.

> **Si una variable no llega al worker, empezar por `npx wrangler secret list`.** El panel de Cloudflare confirma que guardó, pero no contra qué recurso: si en la cuenta conviven un proyecto de Pages y un Worker con el mismo nombre, un secreto puede quedar cargado en el equivocado sin ningún aviso. Ese comando es la única fuente que dice qué tiene realmente el Worker desplegado.

### Diagnosticar un fallo en producción

`observability` está activada en `wrangler.jsonc`, así que los `console.error` del servidor quedan registrados:

```bash
npx wrangler login
npx wrangler tail barzol-web
```

Ante un 500, los endpoints de `/api/**` suelen dar la pista más rápida: devuelven `ApiResponse` con el motivo, mientras que las páginas sólo muestran `500.astro`.
