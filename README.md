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

Se despliega en **Cloudflare Pages** con el adaptador `@astrojs/cloudflare` (`output: 'server'`). Antes del primer deploy hay que cargar las variables de `.env.example` en Cloudflare → Workers & Pages → `barzol-web` → Settings → Variables and Secrets.

El contenido multimedia vive en **Cloudflare R2** (bucket `barzol-web`), enlazado como binding `MEDIA` en `wrangler.jsonc`. Al estar hosting y storage en la misma plataforma, la escritura no usa credenciales: el acceso lo concede el binding. Ver ARCHITECTURE.md § Storage de multimedia.

Tras cambiar bindings en `wrangler.jsonc`, correr `npm run generate-types` y commitear `worker-configuration.d.ts`.
