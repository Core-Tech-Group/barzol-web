# Barzol Web

Catálogo web de Barzol 3D Industry S.A.C.: home, catálogo de productos por categoría, ficha de producto, galería, y panel de administración. Construido con Astro + React (islas) + Tailwind, desplegado en Vercel, con los datos en Supabase y el contenido multimedia en Cloudflare R2.

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

## Despliegue

El proyecto se despliega en **Vercel** con el adaptador `@astrojs/vercel` (`output: 'server'`). Antes del primer deploy hay que cargar en **Vercel → Project Settings → Environment Variables** las mismas variables de `.env.example`; sin ellas el sitio responde error en cada request.

El contenido multimedia vive en **Cloudflare R2** (bucket `barzol-web`) y se sube directo desde el navegador con URL prefirmada, sin pasar por el servidor. Ver ARCHITECTURE.md § Storage de multimedia.
