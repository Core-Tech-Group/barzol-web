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
| Hosting | Cloudflare Pages (plan Free) |
| Modo de renderizado | `output: 'server'` + `@astrojs/cloudflare` (requerido por el admin: POST/PUT/DELETE no funcionan en modo estático puro) |
| Dominio | Registrador a definir (~S/. 40-70/año) |
| Color primario de marca | `#1e4d8c` |

### Justificación de costos

Presupuesto anual acordado: S/. 160-330. Con este stack, el único gasto real es el dominio (~S/. 40-70/año); hosting, base de datos e imágenes corren en planes gratuitos. Ver sección [Riesgos y mitigaciones](#riesgos-y-mitigaciones).

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
│       └── galeria/
│           └── index.ts
│
├── landing/                      # TODO lo del visitante — una carpeta por vista, nada más entra aquí
│   ├── layout/
│   │   └── PublicLayout.astro      # Header + <slot /> + Footer, usado por TODAS las vistas de landing/
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
    │   │   └── client.ts            # Conexión a Supabase/Postgres
    │   ├── productos/
    │   │   ├── productoService.ts   # ÚNICA fuente de productos (mock hoy, Supabase mañana)
    │   │   └── productoMapper.ts
    │   ├── categorias/
    │   │   └── categoriaService.ts  # ÚNICA fuente de categorías — landing/shared/Header.astro también importa de aquí
    │   ├── galeria/
    │   │   └── galeriaService.ts
    │   ├── storage/
    │   │   └── r2Client.ts          # Cliente de Cloudflare R2
    │   ├── validation/
    │   │   └── [entidad]Schema.ts   # Schemas de Zod, uno por entidad
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

> **Estado actual (pendiente):** `landing/shared/Header.astro` todavía define su menú de categorías (`megaCats`) inline en vez de leerlo de `shared/lib/categorias/categoriaService`. Se dejó así intencionalmente durante la reestructuración de carpetas (que fue solo movimiento de archivos, sin tocar lógica) — queda como próxima tarea.

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
| Variables de entorno | UPPER_SNAKE_CASE con prefijo `BARZOL_` | `BARZOL_SUPABASE_URL`, `BARZOL_R2_ACCESS_KEY` |
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
| `/admin/login` | AdminLayout | `admin/login/LoginView.astro` | Login del panel (mock — Supabase Auth pendiente) |
| `/admin` | AdminLayout | `admin/dashboard/DashboardView.astro` | Dashboard del panel |
| `/admin/productos` | AdminLayout | `admin/productos/ProductosView.astro` | CRUD de productos |
| `/admin/categorias` | AdminLayout | `admin/categorias/CategoriasView.astro` | CRUD de categorías |

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

> **Estado actual:** no implementado todavía. `pages/api/**` sigue devolviendo `ApiResponse<T>` sin pasar por Zod — pendiente para cuando se conecte Supabase.

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

## Esquema de Base de Datos (borrador inicial)

### `categorias`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| nombre | text | |
| slug | text | único |
| imagen_url | text | referencia a R2, opcional |

### `productos`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| nombre | text | |
| slug | text | único — usado en la URL pública `/producto/[slug]`, nunca el uuid |
| descripcion | text | |
| precio | numeric | |
| categoria_id | uuid | FK → categorias.id |
| imagen_url | text | referencia a R2 |
| destacado | boolean | default false |
| disponible | boolean | default true |
| created_at | timestamp | |

### `galeria`
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| imagen_url | text | referencia a R2 |
| descripcion | text | opcional |
| created_at | timestamp | |

> Nota: las imágenes **nunca** se guardan como binarios en la base de datos ni en el repositorio — solo la URL apunta a Cloudflare R2.

## Riesgos y Mitigaciones

| Riesgo | Causa | Mitigación |
|---|---|---|
| Pausa por inactividad (Supabase Free) | Sin actividad 7 días | Ping automático diario (ej. cron-job.org, gratis) para mantener la BD activa |
| Salto de costo al superar plan gratis | Crecimiento de datos/tráfico | ORM (Drizzle/Prisma) para poder migrar de proveedor de BD sin reescribir código |
| Pérdida de imágenes en cada deploy | Sistema de archivos no persistente en algunos hosts | Imágenes siempre en R2, nunca en `/public` del repo |
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
