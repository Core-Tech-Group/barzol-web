# Barzol Web — Arquitectura y Convenciones

Sitio web tipo catálogo para Barzol: home, catálogo de productos por categoría, galería de fotos y panel de administración (sin login de usuario final, sin carrito). Este documento define el stack, la estructura del proyecto y las convenciones de código, adaptando los principios usados en `barzol-pos-backend` / `barzol-pos-frontend` a la escala de este proyecto.

## Repositorio

- **Nombre:** `barzol-web`
- **Tipo:** monorepo único (frontend + backend integrado, no separado como el POS)

## Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Framework | Astro |
| UI interactiva (islas) | React (componentes puntuales: filtros, lightbox de galería) |
| Backend | API routes / endpoints de servidor de Astro |
| Base de datos | PostgreSQL (Supabase, plan Free) |
| Almacenamiento de imágenes | Cloudflare R2 (plan Free) |
| ORM | Drizzle o Prisma (a definir) |
| Validación de datos | Zod |
| Hosting | Cloudflare Workers con assets estáticos (plan Free) — se despliega con `wrangler deploy`, no con Pages |
| Modo de renderizado | `output: 'server'` + `@astrojs/cloudflare` (requerido por el admin: POST/PUT/DELETE no funcionan en modo estático puro) |
| Dominio | Registrador a definir (~S/. 40-70/año) |
| Color primario de marca | `#1e4d8c` |

### Justificación de costos

Presupuesto anual acordado: S/. 160-330. Con este stack, el único gasto real es el dominio (~S/. 40-70/año); hosting, base de datos e imágenes corren en planes gratuitos. Ver sección [Riesgos y mitigaciones](#riesgos-y-mitigaciones).

### Un solo ecosistema

Hosting, almacenamiento de multimedia y CDN son **todos de Cloudflare**. No es una preferencia estética: al vivir en la misma plataforma, R2 se consume por *binding* (`wrangler.jsonc` → `r2_buckets`) y no por credenciales. Eso elimina de raíz las claves de acceso S3, la firma de peticiones y la configuración de CORS — tres superficies de fallo y de fuga que aparecerían si el hosting estuviera en otro proveedor. La única pieza fuera del ecosistema es Supabase, que aporta lo que Cloudflare no cubre en el plan gratuito: PostgreSQL con autenticación.

### Variables de entorno

Todas las variables son **de servidor**: al no llevar el prefijo `PUBLIC_`, Astro no las incluye en el bundle del navegador. Renombrar cualquiera a `PUBLIC_*` filtraría el secreto al cliente.

Se leen **siempre** con `requireServerEnv()` / `readServerEnv()` de `shared/lib/env/serverEnv.ts`, que las toma del objeto `env` de `cloudflare:workers`. Nunca con `import.meta.env.BARZOL_*` directo: Vite sustituye cada acceso `import.meta.env.X` por su valor **de build time**, y las variables de Cloudflare son invisibles en ese momento, así que quedan como `undefined` fijo dentro del bundle. Con un patrón como `if (!url) throw ...` eso pliega la condición en un `throw` incondicional y elimina el resto como código muerto — el despliegue falla en cada request aunque las variables estén bien cargadas. Tampoco se usa `process.env`: en el worker se compila a un objeto vacío.

| Variable | Uso |
|---|---|
| `BARZOL_SUPABASE_URL` / `BARZOL_SUPABASE_ANON_KEY` | Cliente de datos y sesión del admin |
| `BARZOL_SUPABASE_SERVICE_ROLE_KEY` | Reservada — saltar RLS; hoy sin uso |
| `BARZOL_R2_PUBLIC_URL` | Base pública de lectura del bucket, sin barra final |

R2 **no** aparece con credenciales: la escritura va por el binding `MEDIA`, no por claves.

**Convención `_URL`:** toda variable cuyo nombre termina en `_URL` debe ser una URL absoluta `http`/`https`, y `readServerEnv()` lo valida al leerla — si no lo es, lanza `InvalidEnvError` nombrando la variable. Existe porque un valor mal pegado en el panel de Cloudflare (los corchetes de un enlace de markdown quedaron dentro del valor) tumbó producción con un `Invalid supabaseUrl` que no decía de qué variable venía. El mensaje del error **no incluye el valor recibido**: una URL de servicio puede llevar token en el query string.

En local viven en `.env` (ignorado por git), que wrangler carga dentro del worker — el build lo confirma con `Using secrets defined in .env`. En producción, en Cloudflare → Workers & Pages → `barzol-web` → Settings → Variables and Secrets. `.env.example` es la plantilla y sí se versiona.

> **`keep_vars: true` en `wrangler.jsonc` no es opcional mientras las variables vivan en el panel.** Por defecto wrangler trata ese archivo como única fuente de verdad, al estilo terraform: como no declara ningún bloque `vars`, cada `wrangler deploy` **borra** las variables cargadas desde el panel. El pipeline de Cloudflare corre `npx wrangler deploy` en cada push, así que el sitio se caía solo al desplegar. Los Secrets no se ven afectados. Si algún día se decide versionar las variables en el archivo, esa línea deja de hacer falta.

> **Única excepción a la regla anterior: `shared/lib/build/buildInfo.ts`.** El SHA del commit y la fecha de compilación se inyectan en tiempo de build desde `astro.config.mjs` (`vite.define`), no se leen con `serverEnv.ts`. No es una inconsistencia: `WORKERS_CI_COMMIT_SHA` existe **sólo en el entorno de build** de Cloudflare y no en el runtime del worker, así que leerlo desde `cloudflare:workers` devolvería siempre `undefined`. Por eso vive en su propio archivo, con la excepción explicada, en vez de mezclarse con la lectura de configuración normal. Lo consume `/api/diagnostico` para poder responder qué versión del código está atendiendo.

> **Nota sobre `worker-configuration.d.ts`:** lo genera `npm run generate-types` a partir de `wrangler.jsonc` y **se versiona**, porque `tsconfig.json` lo incluye: sin él, `npm run check` falla en un clon recién hecho. Hay que regenerarlo cada vez que cambien los bindings.

## Estructura de Carpetas

Organización por **zona explícita**: `landing/` (visitante), `admin/` (administrador) y `shared/` (compartido entre ambos). `pages/` existe porque Astro lo exige para el enrutamiento (file-based routing), pero solo contiene archivos delgados que apuntan a la vista real — nunca lógica ni marcado extenso.

```
src/
├── pages/                        # SOLO rutas — Astro exige este nombre/ubicación para generar URLs
│   ├── index.astro                 # Archivo delgado: importa y renderiza landing/home/HomeView.astro
│   ├── catalogo/
│   │   └── [categoria].astro       # → landing/catalogo/CatalogoView.astro
│   ├── producto/
│   │   └── [slug].astro            # → landing/producto/ProductoView.astro (slug, no id)
│   ├── galeria.astro               # → landing/galeria/GaleriaView.astro
│   ├── servicios.astro             # → landing/servicios/ServiciosView.astro
│   ├── nosotros.astro              # → landing/nosotros/NosotrosView.astro
│   ├── busqueda.astro              # → landing/busqueda/BusquedaView.astro
│   ├── admin/
│   │   ├── index.astro             # → admin/dashboard/DashboardView.astro
│   │   ├── productos.astro         # → admin/productos/ProductosView.astro
│   │   └── categorias.astro        # → admin/categorias/CategoriasView.astro
│   └── api/                        # Endpoints de servidor (.ts) — sin interfaz visual, devuelven ApiResponse<T>
│       ├── productos/
│       │   ├── index.ts            # GET (listar), POST (crear) — valida con Zod
│       │   └── [id].ts             # GET, PUT, DELETE por id — valida con Zod
│       ├── categorias/
│       │   ├── index.ts
│       │   └── [id].ts
│       ├── galeria/
│       │   └── index.ts
│       └── media/
│           └── index.ts        # POST — sube un archivo a R2 por el binding MEDIA
│
├── landing/                      # TODO lo del visitante — una carpeta por vista, nada más entra aquí
│   ├── layout/
│   │   ├── PublicLayout.astro      # Header + <slot /> + Footer, usado por TODAS las vistas de landing/
│   │   └── ErrorLayout.astro       # 404 y 500 — autónomo, SIN Header ni acceso a datos (ver abajo)
│   ├── shared/                     # Compartido SOLO entre vistas del landing (no lo usa admin/)
│   │   ├── Header.astro             # Barra de anuncio + mega menú categorías + mega menú servicios
│   │   ├── Footer.astro
│   │   ├── Breadcrumb.astro         # Usado por catalogo/ y producto/
│   │   ├── WhatsAppIcon.astro
│   │   └── WhatsAppButton.astro
│   ├── home/
│   │   ├── HomeView.astro
│   │   └── ServicePromoCard.astro   # Solo se usa en HomeView
│   ├── catalogo/
│   │   └── CatalogoView.astro
│   ├── producto/
│   │   ├── ProductoView.astro
│   │   ├── ProductCard.astro        # Solo se usa en vistas de producto/catálogo/home
│   │   └── ProductCarousel.astro
│   ├── galeria/
│   │   └── GaleriaView.astro
│   ├── servicios/
│   │   ├── ServiciosView.astro
│   │   └── ServiceFeatureBlock.astro
│   ├── nosotros/
│   │   └── NosotrosView.astro
│   └── busqueda/
│       ├── BusquedaView.astro
│       └── Pagination.astro         # También la usa CatalogoView
│
├── admin/                        # TODO lo del administrador — una carpeta por vista
│   ├── layout/
│   │   └── AdminLayout.astro       # Nav propia del panel, usado por TODAS las vistas de admin/
│   ├── dashboard/
│   │   └── DashboardView.astro
│   ├── productos/
│   │   └── ProductosView.astro
│   └── categorias/
│       └── CategoriasView.astro
│
├── middleware.ts                  # Protege /admin/** y escrituras de /api/** (ver Autenticación del Admin)
│
└── shared/                        # Compartido entre landing/ Y admin/ — si algo solo lo usa un lado, NO va aquí
    ├── lib/                        # Lógica de negocio / acceso a datos, separada de las rutas
    │   ├── db/
    │   │   └── client.ts            # `getSupabase()` — instancia perezosa, única para todo el server
    │   ├── env/
    │   │   └── serverEnv.ts         # ÚNICA lectura de variables de entorno del servidor
    │   ├── build/
    │   │   └── buildInfo.ts         # Commit y fecha del bundle — inyectados en build (ver excepción arriba)
    │   ├── productos/
    │   │   ├── productoService.ts   # ÚNICA fuente de productos (mock hoy, Supabase mañana)
    │   │   └── productoMapper.ts    # fila cruda de `product` (+ joins) → `Product` — sin usar hasta que exista la consulta real
    │   ├── categorias/
    │   │   ├── categoriaService.ts  # ÚNICA fuente de categorías — landing/shared/Header.astro también importa de aquí
    │   │   └── categoriaMapper.ts   # filas de `category` (autorreferenciada) → árbol `Category[]` con subcategorías anidadas
    │   ├── galeria/
    │   │   ├── galeriaService.ts    # ÚNICA fuente de galería — sirve ambas galerías del sitio, filtrable por `tipo`
    │   │   └── galeriaMapper.ts     # fila cruda de `gallery_item` → `GalleryItem`
    │   ├── home/
    │   │   ├── homeService.ts       # ÚNICA fuente de la página de inicio (hero images + secciones/banners)
    │   │   └── homeMapper.ts        # filas de `home_hero_image` / `home_item` (+ join `home_section_product`) → tipos de home
    │   ├── configuracion/
    │   │   ├── configuracionService.ts  # ÚNICA fuente de la configuración del sitio (WhatsApp, contacto, redes, banner de personalización) — tabla singleton
    │   │   └── configuracionMapper.ts   # fila cruda de `site_configuration` → `Configuracion`
    │   ├── storage/                 # Cloudflare R2 — una responsabilidad por archivo
    │   │   ├── r2Bucket.ts          # Acceso al binding MEDIA (sin credenciales)
    │   │   ├── mediaKey.ts          # Funciones puras: sanea el nombre y arma la clave del objeto
    │   │   ├── mediaUrl.ts          # clave → URL pública de lectura
    │   │   └── mediaStorage.ts      # Escribe en R2 pasando el cuerpo como stream
    │   ├── validation/
    │   │   ├── [entidad]Schema.ts   # Schemas de Zod, uno por entidad
    │   │   ├── mediaSchema.ts       # Allow-list de MIME + límites de tamaño de la subida
    │   │   └── zodError.ts          # ZodError → texto de `ApiResponse.message`
    │   └── errors/
    │       └── apiError.ts          # Manejo de errores centralizado
    ├── styles/
    │   └── tokens.css               # Fuente única de verdad de colores/tipografía
    ├── types/
    │   └── index.ts                  # Tipos compartidos (Product, Category, ApiResponse<T>) — TODA vista tipa contra esto
    └── api/
        └── apiResponse.ts            # Envoltorio { success, data, message }, igual que el POS
```

**Regla de oro:** antes de crear o buscar un archivo, pregúntate primero **"¿esto es del visitante, del admin, o de ambos?"** — esa respuesta te dice si va en `landing/`, `admin/` o `shared/`. Recién después, dentro de esa zona, ubica la carpeta de la vista específica (`home/`, `productos/`, etc.). Si un archivo lo usan 2 o más vistas de la misma zona (ej. `Breadcrumb.astro` en `catalogo/` y `producto/`), va en el `shared/` de esa zona, no en la carpeta de una vista específica.

**Principio clave (heredado del POS):** separar la lógica de acceso a datos (`shared/lib/`) de las rutas HTTP (`pages/api/`), para poder cambiar de proveedor de base de datos sin reescribir endpoints.

**Regla de datos mock:** todo dato de prueba vive en `shared/lib/[feature]/[feature]Service.ts`. Ninguna vista, layout o componente (incluido `landing/shared/Header.astro`) define arreglos de productos/categorías inline. Cuando se conecte Supabase, solo estos archivos de servicio cambian — el resto del proyecto no se toca.

**Patrón Row + Mapper (integración transparente con la DB futura):** cada `[feature]Service.ts` tiene un `[feature]Mapper.ts` hermano que ya documenta, hoy, sin conexión real: (1) la forma exacta de la fila cruda tal como la va a devolver Supabase (columnas `snake_case`, alineadas 1:1 con `DATABASE_SCHEMA.md`, incluidas las que vienen unidas por `join`) y (2) la función pura que convierte esa fila al tipo de `shared/types/index.ts` que ya consume el resto del proyecto. Estos archivos **no se importan desde ningún lado todavía** — son la especificación de la consulta real, escrita de antemano. El día que se conecte el ORM, el trabajo en cada servicio se reduce a reemplazar el arreglo mock por `consulta(...).then(mapper)`; ninguna vista, isla ni endpoint se toca porque la firma de cada función del servicio no cambia.

> **Estado actual:** `landing/shared/Header.astro` ya lee su menú de categorías (`navCats`) desde `shared/lib/categorias/categoriaService` — no hay datos de categorías hardcodeados en el componente.

**Alias de imports:** configurado en `tsconfig.json` (y espejado en `astro.config.mjs` → `vite.resolve.alias`, necesario para que Vite los resuelva en runtime) — `@/*` → `src/*`, `@landing/*` → `src/landing/*`, `@admin/*` → `src/admin/*`, `@shared/*` → `src/shared/*`. Ejemplo: `import { getProductos } from '@shared/lib/productos/productoService'`.

## Convenciones de Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Variables y funciones | camelCase | `productList`, `getProductById()` |
| Clases, tipos e interfaces | PascalCase | `Product`, `ProductRepository`, `ApiResponse<T>` |
| Constantes globales | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE`, `DEFAULT_PAGE_SIZE` |
| Componentes/vistas Astro/React | PascalCase | `ProductCard.astro`, `HomeView.astro` |
| Archivos de lógica/servicios | camelCase | `productoService.ts` |
| Rutas de API | kebab-case | `/api/productos`, `/api/categorias` |
| Variables de entorno | UPPER_SNAKE_CASE con prefijo `BARZOL_` | `BARZOL_SUPABASE_URL`, `BARZOL_R2_PUBLIC_URL` |
| Columnas de base de datos | snake_case | `product_name`, `created_at`, `category_id` |
| IDs expuestos en API | UUID (nunca IDs secuenciales) | igual que el POS |
| Slugs (URLs amigables) | kebab-case | `zapatilla-nike-air`, no el UUID en la URL pública |

## Mapa de Páginas (fuente de verdad — actualizar aquí primero ante cualquier página nueva)

| Ruta | Layout | Vista real | Propósito |
|---|---|---|---|
| `/` | PublicLayout | `landing/home/HomeView.astro` | Home |
| `/catalogo/[categoria]` | PublicLayout | `landing/catalogo/CatalogoView.astro` | Listado de productos por categoría |
| `/producto/[slug]` | PublicLayout | `landing/producto/ProductoView.astro` | Ficha de producto |
| `/galeria` | PublicLayout | `landing/galeria/GaleriaView.astro` | Galería de fotos |
| `/servicios` | PublicLayout | `landing/servicios/ServiciosView.astro` | Institucional |
| `/nosotros` | PublicLayout | `landing/nosotros/NosotrosView.astro` | Institucional |
| `/busqueda` | PublicLayout | `landing/busqueda/BusquedaView.astro` | Resultados de búsqueda, usa `Pagination.astro` |
| `/500` | ErrorLayout | `pages/500.astro` | Error de servidor |
| `/404` | ErrorLayout | `pages/404.astro` | Ruta inexistente |
| `/admin/login` | AdminLayout | `admin/login/LoginView.astro` | Login del panel (Supabase Auth real) |
| `/admin` | AdminLayout | `admin/dashboard/DashboardView.astro` | Dashboard del panel |
| `/admin/productos` | AdminLayout | `admin/productos/ProductosView.astro` | CRUD de productos |
| `/admin/categorias` | AdminLayout | `admin/categorias/CategoriasView.astro` | CRUD de categorías |
| `/admin/inicio` | AdminLayout | `admin/inicio/InicioView.astro` | Hero, banners y secciones de la home |
| `/admin/galeria-accesorios` | AdminLayout | `admin/galeria/GaleriaAccesoriosView.astro` | Galería de accesorios |
| `/admin/galeria-trabajos` | AdminLayout | `admin/galeria/GaleriaTrabajosView.astro` | Galería de trabajos de ingeniería |
| `/admin/configuracion` | AdminLayout | `admin/configuracion/ConfiguracionView.astro` | Contacto, WhatsApp y redes |

> Regla: cualquier página nueva se agrega primero a esta tabla (ruta + vista real), luego se implementa. Evita que el documento quede desactualizado frente al código real.

## Sistema de Diseño / Tokens

- **Fuente única de verdad:** `src/shared/styles/tokens.css`, con variables `:root` dentro de un bloque `@theme` de Tailwind v4 (CSS-first — no hay `tailwind.config.mjs` separado; el propio `@theme` genera las utilidades `bg-primary`, `text-primary-dark`, etc. a partir de las mismas variables).
- **Nomenclatura semántica, no literal:** `primary`, `primary-dark`, `text-muted` — nunca clases genéricas tipo `blue-800` ni valores hex sueltos en componentes.
- **Color primario de marca:** `#1e4d8c` (único azul primario — no debe convivir con variantes como `#0550ae` en ningún archivo).
- **Tipografía base:** Poppins, definida una sola vez en el token + regla global `button, input, select, textarea { font-family: inherit; }` — nunca declarada inline por componente.
- **Regla:** ningún componente, layout o página declara colores/fuentes/espaciados hardcodeados. Si un valor no existe como token, se agrega al token primero.
- **Excepción documentada:** valores decorativos de un solo uso (paradas de gradientes únicos en heroes/promos) se dejan como literales — tokenizarlos no elimina duplicación real. Ver Changelog.

## Validación de Datos

- **Librería:** Zod.
- **Ubicación:** un schema por entidad en `shared/lib/validation/[entidad]Schema.ts` (ej. `productoSchema.ts`).
- **Regla:** todo `Request` que llega a `pages/api/**` se valida contra su schema de Zod antes de tocar `shared/lib/[feature]/[feature]Service.ts`. Si la validación falla, se responde con el formato de error definido abajo — el endpoint nunca llega al service con datos sin validar.

> **Estado actual:** parcial. Zod ya está instalado y `POST /api/media` valida contra `mediaSchema.ts` antes de tocar nada, devolviendo 400 con el detalle por campo (formateado por `zodError.ts`). Los endpoints de productos, categorías y galería siguen pasando el body sin validar — y eso hoy **rompe `npm run check`**: con los tipos de Cloudflare cargados, `request.json()` devuelve `unknown`, así que pasarlo directo al service es un error de tipos. Son 8 errores preexistentes que desaparecen al validar. Pendiente.

### Storage de multimedia (Cloudflare R2)

La escritura va por el **binding nativo** `MEDIA`, declarado en `wrangler.jsonc`. La plataforma concede el acceso al worker, así que **no hay credenciales de R2 en ninguna parte**: ni Access Key, ni Secret, ni endpoint S3, ni firma de peticiones. Nada que rotar y nada que se pueda filtrar desde el código.

Flujo: el admin hace `POST /api/media?carpeta=<carpeta>&nombre=<archivo>` (protegido por el middleware) con el archivo como cuerpo crudo → el endpoint valida carpeta, nombre, MIME y tamaño → escribe en R2 → devuelve `{ key, publicUrl, contentType, size }` → se guarda `publicUrl` en Supabase.

Reglas que sostienen el diseño:

- **El cuerpo es el archivo en crudo, no un `FormData`.** Así se pasa el `ReadableStream` directo a R2 sin materializarlo: `request.formData()` bufferiza, y un worker dispone de 128 MB.
- **Allow-list de MIME, nunca deny-list.** `image/svg+xml` queda fuera a propósito: un SVG servido desde el dominio público del bucket es un XSS almacenado.
- **El `Content-Type` se normaliza antes de validar** (`image/png; charset=utf-8` → `image/png`): la cabecera admite parámetros y rechazarla por eso descartaría subidas legítimas.
- **La carpeta es un enum cerrado** (`productos` | `galeria` | `home`) y el nombre de archivo se sanea descartando cualquier componente de ruta, así que no se puede escribir fuera del prefijo previsto.
- **La clave lleva un UUID por delante del nombre** — en R2 un `PUT` sobre una clave existente sobrescribe sin avisar.
- **El límite de tamaño es real**: 10 MB para imagen, 100 MB para video, que es el tope de cuerpo de request en el plan Free de Workers.

El binding sirve para escribir, no para publicar: las imágenes se sirven desde la base pública del bucket (`BARZOL_R2_PUBLIC_URL`), no proxeadas por el worker.

## Manejo de Errores

- **Ubicación:** `shared/lib/errors/apiError.ts` — clase o helper central para construir errores consistentes.
- **Convención de respuesta:**

| Situación | Status HTTP | `ApiResponse<T>` |
|---|---|---|
| Éxito | 200 / 201 | `{ success: true, data, message: null }` |
| Validación fallida (Zod) | 400 | `{ success: false, data: null, message: "<detalle de validación>" }` |
| Recurso no encontrado | 404 | `{ success: false, data: null, message: "Producto no encontrado" }` |
| No autenticado (admin) | 401 | `{ success: false, data: null, message: "No autorizado" }` |
| Error de base de datos / interno | 500 | `{ success: false, data: null, message: "Error interno" }` — nunca exponer el error crudo de Supabase al cliente |

- **Regla:** todos los endpoints de `pages/api/**` capturan errores y responden con este formato — ninguno deja pasar un stack trace o error crudo al cliente.

> **Estado actual:** los endpoints ya capturan errores y responden con `ApiResponse<T>` vía `shared/api/apiResponse.ts` (`jsonResponse`/`errorResponse`), pero todavía no existe `shared/lib/errors/apiError.ts` como punto central — pendiente.

### Observabilidad

El detalle del error va al log; al cliente va un mensaje genérico. Las dos mitades de esa regla:

- **`shared/lib/errors/logServerError.ts`** — único punto de escritura de errores del servidor. Emite una línea de JSON por error (`contexto`, `ruta`, `metodo`, nombre, código, stack) por `console.error`, que llega a Observability. **Nunca** incluye valores de variables, cuerpos de petición, cookies ni cabeceras. Lo llama el middleware antes de relanzar: sin eso, una excepción subía muda hasta `500.astro` y no quedaba registro en ningún lado.
- **`GET /api/diagnostico`** — estado de la configuración del worker desplegado sin abrir el panel: qué variables llegaron y con qué forma, qué bindings ve, y si Supabase responde a una consulta real. No devuelve valores de variables ni mensajes de error, sólo su nombre y código. Responde 200 siempre, para no confundirse con el 500 que se está diagnosticando.

El log del despliegue **no** sirve para diagnosticar el sitio caído: termina en `Success` aunque el worker no atienda nada. Runbook completo en `docs/3_recursos/20260813-1730-runbook-diagnostico-produccion.md`.

> **Límite conocido:** con streaming activado, un error lanzado mientras el cuerpo de la página ya está viajando no pasa por el middleware y no queda registrado. Para ese caso está `/api/diagnostico`, que no necesita provocar el error.

## Autenticación del Admin

- **Mecanismo:** Supabase Auth (incluido en el plan Free ya usado para la base de datos).
- **Protección de rutas:** middleware de Astro (`src/middleware.ts`, en la raíz de `src/`, no dentro de `admin/`, porque también protege escrituras de `pages/api/**`) que verifica sesión antes de servir cualquier ruta bajo `/admin/**` y `pages/api/**` de escritura (POST/PUT/DELETE). Si no hay sesión válida, responde 401 (API) o redirige a `/admin/login` (páginas).
- **Alcance:** el usuario final del sitio público nunca tiene login; solo el usuario administrador de Barzol.

> **Estado actual:** no implementado. `src/middleware.ts` no existe todavía; `admin/layout/AdminLayout.astro` es por ahora equivalente al antiguo `BaseLayout.astro`, sin nav propia ni protección de sesión — pendiente.

## Formato de Respuesta de API

Todas las respuestas de `pages/api/**` siguen el mismo envoltorio usado en el POS:

```ts
// shared/api/apiResponse.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
}
```

## Esquema de Base de Datos

Ver [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) — diagrama entidad-relación completo (con Mermaid) derivado de todas las pantallas del admin ya construidas (categorías de 2 niveles, fotos/características múltiples de producto, secciones+banners de la página de inicio, galería, configuración, perfil de admin). El borrador de 3 tablas que vivía antes en esta sección quedó obsoleto frente a la UI real y fue reemplazado por ese archivo.

> Nota: las imágenes **nunca** se guardan como binarios en la base de datos ni en el repositorio — solo la URL apunta a Cloudflare R2.

## Riesgos y Mitigaciones

| Riesgo | Causa | Mitigación |
|---|---|---|
| Pausa por inactividad (Supabase Free) | Sin actividad 7 días | Ping automático diario (ej. cron-job.org, gratis) para mantener la BD activa |
| Salto de costo al superar plan gratis | Crecimiento de datos/tráfico | ORM (Drizzle/Prisma) para poder migrar de proveedor de BD sin reescribir código |
| Pérdida de imágenes en cada deploy | Sistema de archivos no persistente en algunos hosts | Imágenes siempre en R2, nunca en `/public` del repo |
| Build de producción que arranca roto | Variables leídas con `import.meta.env`, congeladas en build time | Lectura obligatoria vía `shared/lib/env/serverEnv.ts`, que las toma de `cloudflare:workers` en runtime. Ver Changelog |
| Video que supera el cuerpo máximo del worker | Tope de 100 MB por request en el plan Free | El límite está validado en `mediaSchema.ts` y devuelve 400 con mensaje claro en vez de un fallo opaco de la plataforma. Si hiciera falta más, la salida es subida multiparte o URL prefirmada |
| Cómputo compartido más lento (Supabase Free) | Recursos compartidos entre proyectos | Aceptable para el volumen de tráfico esperado; reevaluar si el catálogo crece mucho |

## Decisiones Clave

- **Un solo repo** (frontend + backend integrado) — a diferencia del POS, que separa backend y frontend, porque este proyecto no lo justifica por su tamaño.
- **Sin capas domain/service/application** — se descartó la arquitectura hexagonal completa del POS por sobre-diseño; este es un CRUD simple según la propia regla de decisión del POS ("CRUD simple → api/ + data/, sin capas extra").
- **UUID e envoltorio `ApiResponse<T>`** sí se mantienen, por consistencia con el resto de proyectos de la empresa.

## Changelog de Decisiones Técnicas

Registro de decisiones tomadas durante la construcción que no estaban explícitas en la versión inicial de este documento. Toda decisión técnica relevante tomada por Claude Code (o por el equipo) se añade aquí en el momento en que se toma, no después.

| Fecha / Hito | Decisión | Razón |
|---|---|---|
| Construcción inicial | `PublicLayout.astro` separado de `AdminLayout.astro` (reemplaza el `BaseLayout.astro` único planteado al inicio) | El sitio público necesita header/footer/WhatsApp compartidos; el admin necesita una navegación completamente distinta |
| Construcción inicial | `output: 'server'` + `@astrojs/cloudflare` en vez de modo estático puro | El panel admin requiere endpoints de escritura (POST/PUT/DELETE), que no funcionan en modo estático |
| Construcción inicial | Se agregaron `/servicios`, `/nosotros`, `/busqueda` al mapa de páginas | Vistas incluidas en el HTML de diseño exportado, no contempladas en el árbol original del documento |
| Revisión post-diagnóstico | `slug` agregado a la tabla `productos` | La ruta `/producto/[slug]` no tenía columna correspondiente en el esquema original (solo `id`) |
| Revisión post-diagnóstico | Color primario fijado en `#1e4d8c`, eliminado `#0550ae` | Convivían dos azules "primarios" sin resolver desde el HTML original |
| Revisión post-diagnóstico | Tokens de diseño centralizados en `src/shared/styles/tokens.css` vía `@theme` de Tailwind v4 | Evitar valores hardcodeados repetidos (color, fuente) en múltiples componentes; no se creó `tailwind.config.mjs` porque Tailwind v4 es CSS-first y el proyecto usa mayormente `style="..."` inline, no clases |
| Revisión post-diagnóstico | Valores decorativos de un solo uso (paradas de gradientes de hero/promos) quedaron sin tokenizar | No son repetidos — tokenizarlos agrega indirección sin reducir duplicación real |
| Revisión post-diagnóstico | Alias de imports `@/*` en `tsconfig.json` | Evitar rutas relativas largas a medida que crecen `lib/` y `components/` |
| Reestructuración por zonas | Se reemplazó la organización por tipo (`components/`, `layouts/`, `lib/` sueltos) por tres zonas explícitas: `landing/`, `admin/`, `shared/`, con `pages/` reducido a archivos delgados que solo conectan rutas con vistas | La organización por tipo dificultaba ubicar qué pertenecía al visitante vs. al administrador, y generaba la sensación de piezas repetidas o dispersas sin relación visible entre sí |
| Reestructuración por zonas | Alias adicionales `@landing/*`, `@admin/*`, `@shared/*` en `tsconfig.json`, espejados en `astro.config.mjs` (`vite.resolve.alias`) | Reforzar en el propio import a qué zona pertenece cada archivo; tsconfig por sí solo no resuelve los alias en runtime, Vite necesita su propia configuración |
| Reestructuración por zonas | `Breadcrumb.astro` ubicado en `landing/shared/` (no estaba en la lista explícita de archivos a mover) | Lo usan 2 vistas del landing (`CatalogoView` y `ProductoView`), cumple la "regla de oro" de pertenecer a `shared/` de su zona, no a la carpeta de una sola vista |
| Reestructuración por zonas | `ServicePromoCard.astro` ubicado en `landing/home/` (no estaba en la lista explícita) | Solo lo usa `HomeView.astro`; por la "regla de oro" pertenece a la carpeta de esa vista específica, no a `landing/shared/` |
| Reestructuración por zonas | `Pagination.astro` se dejó en `landing/busqueda/` pero también lo importa `CatalogoView.astro` | Se siguió la instrucción explícita de ubicarlo en `busqueda/`; en sentido estricto, al usarlo 2 vistas debería vivir en `landing/shared/` — queda como ajuste pendiente a validar |
| Reestructuración por zonas | `admin/layout/AdminLayout.astro` creado como equivalente funcional del antiguo `BaseLayout.astro` (sin nav propia todavía) | La reestructuración fue solo movimiento de archivos, sin agregar lógica/UI nueva; la nav real del admin queda como tarea aparte |
| Panel admin completo | Esquema de base de datos movido a `DATABASE_SCHEMA.md`, con diagrama Mermaid completo (categorías de 2 niveles, fotos/características de producto, home_items unificado, galería, configuración, admin_profiles) | El borrador de 3 tablas original no reflejaba ninguna de las pantallas reales construidas en `admin/` (Productos, Categorías, Página de inicio, Galería) |
| Storage R2 (2026-08-08) | Se **descartó migrar el hosting a Vercel** y se confirmó Cloudflare Pages | Mantener hosting y storage en la misma plataforma permite consumir R2 por binding. Repartirlos habría obligado a credenciales S3, firma de peticiones y CORS — tres piezas que con un solo ecosistema no existen |
| Storage R2 (2026-08-08) | R2 se consume por **binding nativo** (`r2_buckets` en `wrangler.jsonc`), no por API S3 | Sin credenciales que guardar, rotar o filtrar. Además evita cargar el SDK de AWS, demasiado pesado para workerd |
| Storage R2 (2026-08-08) | La subida **atraviesa el worker** en vez de usar URL prefirmada | Las prefirmadas resolvían el límite de ~4.5 MB de cuerpo de Vercel, que en Workers no existe (100 MB en Free). Sin ese problema, el proxy es más simple y no necesita CORS por ser mismo origen |
| Storage R2 (2026-08-08) | El cuerpo del `POST` es el archivo crudo, con los metadatos en query string y cabeceras | Permite pasar el `ReadableStream` directo a R2. `request.formData()` cargaría el archivo entero en los 128 MB del worker |
| Storage R2 (2026-08-08) | Toda variable de entorno se lee por `shared/lib/env/serverEnv.ts` desde `cloudflare:workers`; queda **prohibido** `import.meta.env.BARZOL_*` directo | Vite congela esos accesos en build time y las variables de Cloudflare son invisibles entonces. Se detectó que `db/client.ts` compilaba a un `throw` incondicional con el `createClient` eliminado como código muerto |
| Storage R2 (2026-08-08) | `db/client.ts` pasa de instancia en el cuerpo del módulo a `getSupabase()` perezoso; se actualizaron los 5 services | En workerd el entorno no existe mientras se evalúan los módulos, sólo dentro de una petición: crear el cliente al importar reventaba al arrancar el worker |
| Storage R2 (2026-08-08) | `image/svg+xml` excluido de la allow-list de subida | Un SVG servido desde el dominio público del bucket es un vector de XSS almacenado |
| Despliegue (2026-08-11) | Se documenta el hosting como **Workers con assets**, no Pages | El despliegue real corre `wrangler deploy` sobre `*.workers.dev`. La distinción no es cosmética: cambia dónde se cargan las variables de entorno en el panel |
| Despliegue (2026-08-11) | `src/pages/500.astro` **sin layout**, autónoma y sin acceso a datos | El primer despliegue devolvió 500 con cuerpo vacío. Una página de error que dependa de `PublicLayout` → `Header` → Supabase volvería a fallar justo cuando la causa es la base o la configuración |
| Despliegue (2026-08-11) | La página de error no muestra el detalle técnico | El mensaje puede contener nombres de variables o estado interno; va a los logs del worker, que ya tiene observabilidad activada |
| Despliegue (2026-08-14) | Se **descartó migrar a Cloudflare Pages** y se confirmó Workers con assets | La documentación de Cloudflare recomienda Workers para proyectos nuevos y sólo publica guía de migración *desde* Pages *hacia* Workers. Pages sigue soportado, pero todo el desarrollo de features va a Workers |
| Despliegue (2026-08-14) | Se **descartó migrar a Workers KV** como almacén de datos | KV es clave-valor de consistencia eventual (hasta 60s de propagación): no admite filtros, joins ni RLS, que es justo lo que usa el catálogo. Ya está en uso donde corresponde — el binding `SESSION` de las sesiones de Astro. Queda como posible caché de lectura, no como base de datos |
| Despliegue (2026-08-14) | `landing/layout/ErrorLayout.astro` compartido por `404.astro` y `500.astro` | Las dos páginas necesitan el mismo cascarón autónomo; duplicarlo habría dejado dos copias que se desincronizan. Las páginas quedan en ~15 líneas y sólo declaran su texto e icono |
| Despliegue (2026-08-15) | El commit y la fecha del build se inyectan con `vite.define` y se exponen en `/api/diagnostico` | Una sesión entera se fue en descubrir que el worker corría código de dos commits atrás, adivinando por rutas. La identidad del bundle desplegado tiene que poder consultarse en una petición |
