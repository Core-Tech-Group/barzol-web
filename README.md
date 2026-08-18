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

**Antes del primer despliegue**, cargar todas las variables de `.env.example` en
Cloudflare → Workers & Pages → `barzol-web` → Settings → **Variables and Secrets**, y volver a desplegar para que el Worker las tome. `BARZOL_R2_PUBLIC_URL` es tan obligatoria como las de Supabase: sin ella la subida funciona pero falla al construir la URL de la imagen.

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

## Despliegue local en Docker (Orange Pi + Cloudflare Zero Trust)

Segundo objetivo de despliegue: **el mismo código** corriendo sobre Node dentro de Docker y publicado por un túnel de Cloudflare Zero Trust, con la base de datos, la autenticación y el multimedia en la propia máquina. Sirve para mostrarle el sistema funcionando al cliente sin depender del despliegue en Cloudflare.

```bash
./scripts/desplegar-local.sh          # levanta todo (la primera vez compila el sitio)
./scripts/desplegar-local.sh --estado # qué está corriendo
./scripts/desplegar-local.sh --logs   # seguir los registros
./scripts/desplegar-local.sh --detener
```

El script es idempotente: crea `docker/.env` la primera vez, genera ahí las claves JWT y la contraseña del admin, aplica `supabase/schema.sql`, carga el catálogo de prueba y da de alta al administrador. Correrlo otra vez no duplica nada ni cambia las contraseñas.

¿Sin dominio propio todavía? `./scripts/tunel-rapido.sh` lo publica por un **Quick Tunnel** de Cloudflare (`*.trycloudflare.com`), reescribiendo de paso las URL de las imágenes ya guardadas en la base — el hostname cambia en cada arranque y sin eso el catálogo queda con las fotos rotas. Es para enseñar el sistema en una sesión: el enlace es público y sin control de acceso.

> **Ojo con el puerto.** El `--url http://localhost:8080` de la documentación de Cloudflare apunta, en esta máquina, al Traefik de otro proyecto. El entrypoint público de Barzol es el `8110` del anfitrión, o `proxy:8080` dentro de la red de Docker — que es lo que usa el script.

El proxy es **Traefik**: un solo contenedor que hace de ingreso público (`:8080`, es a donde apunta el túnel) y de puerta interna de la API de datos (`:80`, no publicado). No lleva montado el socket de Docker — el enrutado va por archivo, en `docker/traefik/`.

Para publicarlo por el túnel hace falta poner dos valores en `docker/.env` — `CLOUDFLARE_TUNNEL_TOKEN` y `BARZOL_PUBLIC_URL` — y apuntar el servicio del túnel a `http://proxy:8080`. El procedimiento completo está en la ficha OP-21 de [docs/2_backlog/20260818-0520-kanban-despliegue-local-orangepi.md](./docs/2_backlog/20260818-0520-kanban-despliegue-local-orangepi.md).

> `DEPLOY_TARGET` sin definir compila para Cloudflare, exactamente como antes. Todo lo de arriba en esta página sigue valiendo igual. Ver ARCHITECTURE.md § Segundo Objetivo de Despliegue.

### Diagnosticar un fallo en producción

`observability` está activada en `wrangler.jsonc`, así que los `console.error` del servidor quedan registrados:

```bash
npx wrangler login
npx wrangler tail barzol-web
```

Ante un 500, los endpoints de `/api/**` suelen dar la pista más rápida: devuelven `ApiResponse` con el motivo, mientras que las páginas sólo muestran `500.astro`.
