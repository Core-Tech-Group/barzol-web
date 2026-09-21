# Propuesta Técnica y Comercial: Implementación de SEO Multicapa y Sistema de Calificaciones / Likes en Productos

> **Documento:** Propuesta Técnica y Estimación Económica  
> **Fecha:** 19 de Septiembre de 2026  
> **Destinatario:** Barzol 3D Industry S.A.C. (Dirección General / William Barzola)  
> **Área:** Arquitectura de Software, E-Commerce y Posicionamiento Web  
> **Estado:** Propuesta formal para revisión y aprobación  
> **Moneda:** Soles Peruanos (PEN / S/)  

---

## 1. Resumen Ejecutivo y Diagnóstico del Proyecto

Barzol Web opera sobre una arquitectura moderna basada en **Astro (SSR en el Edge con Cloudflare Pages)**, componentes React en islas de hidratación estricta y base de datos relacional **Supabase (PostgreSQL)**. El modelo comercial de la empresa no utiliza una pasarela de pago transaccional automatizada (tipo carrito tradicional con Stripe/MercadoPago), sino un **modelo de venta consultiva directa por WhatsApp**, altamente efectivo para productos musicales especializados con opciones de personalización (nombres, logotipos y medidas para instrumentos de viento).

Actualmente, el sitio web cuenta con un catálogo dinámico y visualmente optimizado, pero carece de:
1. **Infraestructura SEO estructurada:** No cuenta con sitemaps XML dinámicos, archivo `robots.txt`, etiquetas canónicas dinámicas, ni marcado de datos estructurados enriquecidos (**JSON-LD / Schema.org**) para productos y categorías.
2. **Sistema de Prueba Social (Social Proof) y Calificaciones:** No existe un mecanismo para mostrar la reputación de los productos ni un canal seguro para que los clientes que adquirieron un accesorio musical puedan calificarlo y reseñarlo.

### Hallazgos en las Capturas del Cliente

* **Captura 1 (Ficha de Detalle de Producto):** El cliente señala explícitamente el espacio ubicado **inmediatamente debajo del bloque de precio y descuento** y sobre la descripción del producto. La anotación manuscrita indica textualmente:  
  > *"Debe de contar con estrellas para que lo puedan calificar los usuarios, en este caso, lo podrían calificar aquellos que adquirieron el producto, por lo que es necesario que se habilite el link que se enviará directamente a los usuarios que adquirieron el producto para que ellos lo puedan puntuar."*
* **Captura 2 (Tarjetas de Producto en Home y Catálogo):** El recuadro rojo se ubica **entre el título del accesorio y el precio**, requiriendo un badge visible y sintetizado de estrellas y volumen de calificaciones (ej. `★★★★★ 4.9 (18)`).

### Sinergia Técnica: SEO + Calificaciones
Ambos requerimientos no son independientes, sino que **se potencian mutuamente**. Al implementar las calificaciones de productos, se habilita el marcado `AggregateRating` de Google en el código fuente. Esto provoca que los resultados de búsqueda de Google muestren las **estrellas doradas y el promedio de opiniones directamente en la página de resultados (SERP)**, lo que incrementa la tasa de clics orgánicos (CTR) entre un **25% y un 35%** frente a competidores que solo muestran texto plano.

---

## 2. Módulo 1: Estrategia y Niveles de SEO

### 2.1. ¿Por qué el SEO no es una tarea simple y qué justifica su precio?

Existe una creencia extendida de que hacer SEO consiste simplemente en "poner palabras clave en los textos" o "avisarle a Google que la página existe". En un desarrollo web moderno para comercio electrónico, el SEO es una **disciplina de ingeniería de software, arquitectura semántica y optimización continua**.

El costo del SEO se fundamenta en cuatro pilares de trabajo real:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          LOS 4 PILARES DEL SEO                         │
├───────────────────┬────────────────────┬───────────────────────────────┤
│ 1. SEO Técnico    │ 2. SEO Semántico   │ 3. SEO On-Page & Contenidos   │
│ (Rendimiento/Edge)│ (Datos JSON-LD)    │ (Palabras Clave & Catálogo)   │
├───────────────────┴────────────────────┴───────────────────────────────┤
│ 4. SEO Local, Indexación & Medición (Google Search Console & Perfil)   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Ingeniería Técnica en el Edge (Cloudflare Pages + Astro):**
   * Google penaliza las páginas lentas o mal estructuradas mediante sus métricas oficiales **Core Web Vitals** (LCP: velocidad de despliegue de imagen principal, CLS: estabilidad visual sin saltos, INP: respuesta táctil inmediata).
   * Requiere programar endpoints dinámicos para que el servidor entregue a los robots rastreadores (Googlebot) un mapa completo del sitio (`/sitemap.xml`) actualizado automáticamente cada vez que se crea o modifica un producto en Supabase, sin saturar la cuota de la base de datos.
   * Requiere directivas estrictas de rastreo (`robots.txt`), control de URLs canónicas (para evitar que variaciones de enlaces o parámetros de búsqueda sean penalizados por "contenido duplicado") y optimización de encabezados HTTP.

2. **Marcado Estructurado para Motores de Búsqueda (Schema.org):**
   * Los motores de búsqueda ya no solo leen texto; interpretan código en formato JSON-LD.
   * Para cada producto se debe generar un objeto semántico formal que declare: nombre, modelo 3D, código SKU, precio en Soles (`PEN`), disponibilidad de inventario (`InStock`), fabricante (`Barzol 3D Industry S.A.C.`), país de origen (`PE`) y, crucialmente, el promedio de calificaciones de los compradores.

3. **Investigación Semántica y Adecuación de Catálogo:**
   * No se redacta para "adivinar", sino en base a cómo buscan los músicos peruanos en Google: *"atril de celular para trompeta lima"*, *"sordina de estudio trombón perú"*, *"soporte para clarinete impresión 3d"*.
   * Cada categoría y producto debe tener optimizados sus metadatos (`<title>`, `<meta name="description">`, textos alternativos `alt` descriptivos en imágenes) sin caer en prácticas penalizables de relleno artificial (*keyword stuffing*).

4. **Configuración de Plataformas Oficiales y Monitoreo:**
   * Vinculación, validación DNS y monitoreo a través de **Google Search Console** para auditar que el 100% de las páginas sean indexadas y corregir errores 404 o de rastreo móvil.

---

### 2.2. Niveles de SEO Propuestos

Para ajustarse a los objetivos y presupuesto de Barzol, se plantean **tres niveles de implementación**:

```
                               NIVEL 3: Integral 360°
                         ┌─────────────────────────────────┐
                         │ • Niveles 1 y 2 incluidos       │
                         │ • Google Maps / Perfil Negocio  │
                         │ • Analítica de Clics a WhatsApp │
                         │ • Estrategia de Contenidos      │
                         │ Inversión: S/ 3,200             │
                         └────────────────┬────────────────┘
                                          │
                               NIVEL 2: E-Commerce Avanzado
                         ┌────────────────┴────────────────┐
                         │ • Nivel 1 incluido              │
                         │ • Schema JSON-LD (Product)      │
                         │ • Estrellas en Google (Snippets)│
                         │ • Search Console Verificado     │
                         │ Inversión: S/ 1,850 [RECOMENDADO│
                         └────────────────┬────────────────┘
                                          │
                               NIVEL 1: Técnico & Fundacional
                         ┌────────────────┴────────────────┐
                         │ • Sitemap.xml dinámico          │
                         │ • Robots.txt en Edge            │
                         │ • Metadatos OG & Canónicas      │
                         │ • Core Web Vitals optimizado    │
                         │ Inversión: S/ 950               │
                         └─────────────────────────────────┘
```

#### Nivel 1: SEO Técnico & Fundacional On-Page (Imprescindible)
*Objetivo:* Garantizar que Google pueda rastrear, leer e indexar el 100% del sitio web sin fallas técnicas, estableciendo las bases mínimas para cualquier presencia digital.

* **Alcance Técnico:**
  1. **Generador Dinámico de Sitemap XML (`/sitemap.xml`):** Endpoint programado en Astro SSR que consulta los slugs de productos y categorías activas desde Supabase y entrega un XML estándar actualizado en tiempo real.
  2. **Configuración de `robots.txt` en producción:** Reglas de acceso que permiten el rastreo de páginas públicas e impiden la indexación de rutas privadas administrativas (`/admin/*`, endpoints de API internos).
  3. **Etiquetas Canónicas Dinámicas:** Inyección de `<link rel="canonical" href="...">` en cada vista para prevenir penalizaciones por parámetros de URL o URLs duplicadas.
  4. **Metadatos Open Graph & Twitter Cards:** Normalización de títulos, descripciones e imágenes destacadas para que al compartir enlaces por WhatsApp, Facebook o redes sociales, la tarjeta visual sea impecable.
  5. **Auditoría Core Web Vitals:** Corrección de la carga de la tipografía Poppins (evitar bloqueo de renderizado con Google Fonts externos mediante precarga eficiente) y marcado semántico HTML5 (jerarquía única de `<h1>`, `<h2>`, `<nav>`, `<main>`).
* **Entregables:**
  * Código fuente integrado y probado en Cloudflare Pages.
  * Archivos `sitemap.xml` y `robots.txt` funcionando en vivo.
  * Reporte de validación de Lighthouse con puntuación de SEO > 95/100.
* **Tiempo estimado de desarrollo:** 5 a 7 días hábiles.
* **Inversión económica:** **S/ 950.00 PEN** (Pago único).

---

#### Nivel 2: SEO E-Commerce Avanzado & Rich Snippets (Recomendado para Barzol)
*Objetivo:* Conseguir que los productos de Barzol resalten visualmente en los resultados de búsqueda de Google con datos de precio en Soles, disponibilidad y estrellas de calificación, superando a competidores genéricos.

* **Alcance Técnico (Incluye todo el Nivel 1 más):**
  1. **Datos Estructurados JSON-LD (`schema.org`):**
     * `Product`: Nombre, descripción comercial, fotos alojadas en Cloudflare R2, código SKU/código interno, marca oficial Barzol.
     * `Offer`: Moneda peruana (`priceCurrency: "PEN"`), precio actual, condición del ítem (`NewCondition`), disponibilidad (`InStock`).
     * `AggregateRating`: Vinculación directa con el módulo de calificaciones de la base de datos (puntuación promedio y cantidad de votos), permitiendo que Google muestre las estrellas doradas en la búsqueda.
     * `BreadcrumbList`: Ruta de migas de pan estructurada (Inicio > Instrumento > Accesorio) para mostrar navegación clara en Google.
     * `Organization`: Datos oficiales de Barzol 3D Industry S.A.C., canales de contacto y logotipo.
  2. **Optimización de Metadatos del Catálogo:**
     * Revisión y optimización de las descripciones y palabras clave (`keywords`) de los productos actuales en la base de datos, incorporando términos de intención de compra en Perú.
  3. **Optimización SEO de Medios en Cloudflare R2:**
     * Atributos `alt` contextuales e informativos en español para cada foto de producto (crucial para Google Imágenes).
  4. **Configuración y Verificación en Google Search Console:**
     * Verificación de propiedad de dominio vía registros DNS o archivo en Cloudflare.
     * Envío oficial del Sitemap a Googlebot para indexación acelerada.
     * Configuración de geolocalización orientada a Perú.
* **Entregables:**
  * Inyección dinámica de JSON-LD validada en la herramienta oficial *Google Rich Results Test*.
  * Consola de Google Search Console configurada y entregada con informe inicial de rastreo.
  * Documento guía para que el administrador mantenga las buenas prácticas al ingresar nuevos productos.
* **Tiempo estimado de desarrollo:** 10 a 14 días hábiles.
* **Inversión económica:** **S/ 1,850.00 PEN** (Pago único).

---

#### Nivel 3: SEO Integral 360°, Posicionamiento Local & Analítica de Conversión
*Objetivo:* Dominar las búsquedas especializadas de accesorios musicales a nivel nacional (Lima y provincias), optimizar la ficha física de la empresa en Google Maps y medir el retorno real de la inversión mediante clics directos al WhatsApp de ventas.

* **Alcance Técnico (Incluye todo el Nivel 1 y Nivel 2 más):**
  1. **Investigación Profunda de Palabras Clave (Keyword Research):**
     * Análisis de volumen de búsqueda y competencia para términos transaccionales en Perú (*"soportes 3d para partituras"*, *"silenciador sordina trompeta lima"*, *"accesorios para instrumentos de viento ayacucho"*).
     * Reestructuración y redacción SEO persuasiva para las fichas de productos y las páginas de servicios (*Accesorios Personalizados* y *Trabajos de Ingeniería*).
  2. **SEO Local y Google Perfil de Negocio (Google Maps):**
     * Optimización de la ficha de Barzol en Google Maps (categorización exacta, catálogo de productos integrado con fotos, horarios de atención, publicaciones iniciales).
     * Vinculación coherente de datos NAP (Name, Address, Phone) entre la web y Google Maps para reforzar la autoridad local.
  3. **Configuración de Analítica Avanzada Orientada a WhatsApp:**
     * Implementación de eventos de seguimiento (Cloudflare Web Analytics o Google Analytics 4) para medir con exactitud: cuántas personas llegaron desde Google a un producto específico y cuántas hicieron clic en el botón *"Consultar por WhatsApp"*.
     * Identificación de qué productos generan más interés real de compra.
  4. **Estrategia de Enlaces Internos y Arquitectura de Categorías:**
     * Optimización de enlaces cruzados entre accesorios afines y sugerencias por instrumento para retener al usuario y transferir autoridad de página a página.
* **Entregables:**
  * Estudio de palabras clave del sector de accesorios musicales en Perú.
  * Ficha de Google Perfil de Negocio optimizada y verificada.
  * Panel de métricas con seguimiento de conversiones hacia WhatsApp.
  * 30 días de monitoreo y soporte post-lanzamiento para ajustes de indexación.
* **Tiempo estimado de desarrollo:** 18 a 22 días hábiles.
* **Inversión económica:** **S/ 3,200.00 PEN** (Pago único).  
  *(Opción de Acompañamiento Mensual post-proyecto: S/ 750.00 PEN / mes para monitoreo, reportes de posicionamiento mensual y optimización continua de nuevos productos).*

---

## 3. Módulo 2: Sistema de Calificaciones, Reseñas y "Likes" en Productos

### 3.1. Análisis Detallado del Requerimiento según Capturas

El usuario solicita: *"Likes en los productos (estilo tiendas grandes como Falabella) donde actualmente están los productos (se especifica en la captura 1 y 2)"*.

Al revisar minuciosamente las imágenes adjuntas y su caligrafía técnica:

1. **Captura 1 (Página de Detalle de Producto):**
   * El cliente marcó con un recuadro rojo el espacio entre el precio de venta (`S/ 100.00  S/ 120.00  17% OFF`) y la descripción del producto.
   * La instrucción escrita indica:
     > *"Debe de contar con estrellas para que lo puedan calificar los usuarios, en este caso, lo podrían calificar aquellos que adquirieron el producto, por lo que es necesario que se habilite el link que se enviará directamente a los usuarios que adquirieron el producto para que ellos lo puedan puntuar."*
2. **Captura 2 (Tarjetas de Producto en Home y Catálogo):**
   * El cliente marcó con una flecha roja el área entre el nombre del producto (*"Soporte de celular para trombón"*) y el precio (`S/ 100.00`).
   * En ese espacio debe ubicarse el resumen de estrellas y conteo de valoraciones acumuladas.

#### Clarificación Técnica: ¿"Likes" o "Calificaciones con Estrellas"?
En plataformas como Falabella, Amazon o MercadoLibre coexisten dos funcionalidades con propósitos distintos:
* **Calificaciones y Reseñas de Compra Verificada (Estrellas 1 a 5 + Comentario):** Demuestran calidad técnica y experiencia de uso. Es el requerimiento **explícito y textual** de las notas de la Captura 1.
* **Likes / Lista de Deseos (Botón de Corazón / Guardar):** Permite al usuario que está navegando marcar qué productos le gustan para no perderlos de vista, sin necesidad de haber comprado.

Para cubrir con total rigor ambas necesidades, presentamos la solución técnica por componentes modulares.

---

### 3.2. Arquitectura de la Solución: Calificaciones Verificadas por Enlace (Capturas 1 y 2)

Dado que Barzol vende por WhatsApp y no existe un carrito automatizado que dispare correos tras una pasarela, la arquitectura debe resolver el flujo de forma pragmática, elegante y segura para el administrador y los clientes.

#### Flujo Operativo y de Negocio

```
┌────────────────────────┐       Genera enlace único      ┌────────────────────────┐
│  Panel Administrativo  │ ─────────────────────────────> │  Link con Token Seguro │
│  (/admin/calificaciones)│                                │  ej. barzol.pe/evaluar │
└────────────────────────┘                                └───────────┬────────────┘
                                                                      │
                                                           Envía por  │ WhatsApp tras
                                                           la entrega │ del producto
                                                                      ▼
┌────────────────────────┐       Formulario Mobile-First  ┌────────────────────────┐
│  Músico Comprador      │ <───────────────────────────── │  Abre en su Smartphone │
│  Envía: 5 ★ + Reseña   │                                │  (Sin crear cuenta)    │
└───────────┬────────────┘                                └────────────────────────┘
            │
            │ Inserta en Supabase (status: 'pending' o 'approved')
            ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             ACTUALIZACIÓN AUTOMÁTICA                             │
├────────────────────────────────┬─────────────────────────────────────────────────┤
│ En Ficha de Producto (Captura 1)│ En Tarjeta de Catálogo (Captura 2)              │
│ • Bloque de estrellas bajo precio│ • Estrellas bajo el nombre del accesorio         │
│ • Conteo de reseñas verificadas│ • Sincronización con Google Rich Snippets       │
└────────────────────────────────┴─────────────────────────────────────────────────┘
```

1. **Generación del Enlace en el Panel Admin (`/admin`):**
   * En la ficha del producto o en una nueva sección de calificaciones, el administrador hace clic en: *"Generar Enlace de Calificación"*.
   * El sistema genera una URL única con un token criptográfico seguro de un solo uso (ej. `https://barzol.pe/calificar/a9f82d1c-b72e-4b91-9e5c-18df92a63201`).
   * El administrador presiona un botón *"Copiar Enlace"* o *"Enviar por WhatsApp"* para compartirlo con el cliente que acaba de recibir su atril o sordina.
2. **Experiencia del Cliente (Músico):**
   * El comprador abre el enlace en su teléfono. No se le exige registrarse ni recordar contraseñas.
   * La interfaz muestra la foto y nombre del accesorio que compró con un selector táctil de 1 a 5 estrellas, un campo para su nombre (ej. *"Carlos Mendoza — Trombonista Orquesta Sinfónica"*), su ciudad y un comentario opcional sobre el calce y resistencia del material 3D.
   * Al pulsar *"Enviar Calificación"*, el token se marca como utilizado (`used_at = now()`), impidiendo votos duplicados o falsificaciones.
3. **Moderación y Control en el Panel Admin:**
   * Las reseñas ingresan con estado `pending` (pendiente) o se auto-aprueban según la configuración elegida por Barzol, permitiendo al administrador ocultar cualquier comentario malicioso o inapropiado antes de su publicación.
4. **Visualización en el Sitio Público (Zero-JS SSR):**
   * **Tarjetas en Home y Catálogo (Captura 2):** Se renderiza un componente ultraligero de estrellas doradas y promedio (ej. `★ 4.9 (15)`) en puro HTML/CSS sin cargar JavaScript adicional al cliente, manteniendo una velocidad de carga de 100 puntos en móviles.
   * **Ficha de Detalle (Captura 1):** Inmediatamente debajo del bloque de precio/descuento se ubica el promedio con estrellas y el link ancla que desplaza la página hacia la sección inferior donde se muestran las opiniones de otros compradores verificados con la insignia oficial: `Comprador Verificado ✔`.

---

### 3.3. Modelo de Base de Datos Propuesto (Supabase / PostgreSQL)

Siguiendo el estándar del proyecto establecido en `DATABASE_SCHEMA.md` (nombres de tablas en singular, claves foráneas estrictas, triggers automáticos y políticas RLS):

```sql
-- 1. Tabla de tokens para invitar a compradores
CREATE TABLE product_review_token (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    integer NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    client_name   varchar(120),
    is_used       boolean NOT NULL DEFAULT false,
    used_at       timestamptz,
    expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    created_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);

-- 2. Tabla de reseñas y calificaciones
CREATE TABLE product_review (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id    integer NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    token_id      uuid UNIQUE REFERENCES product_review_token(id) ON DELETE SET NULL,
    rating        smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
    author_name   varchar(100) NOT NULL,
    author_city   varchar(100),
    comment       text,
    is_verified   boolean NOT NULL DEFAULT true,
    is_approved   boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. Índices de alta velocidad para consulta en Catálogo y Home
CREATE INDEX idx_product_review_product_approved ON product_review(product_id) WHERE is_approved = true;

-- 4. Columnas en caché en la tabla product para evitar recálculos lentos
ALTER TABLE product ADD COLUMN rating_avg numeric(2,1) NOT NULL DEFAULT 0.0;
ALTER TABLE product ADD COLUMN rating_count integer NOT NULL DEFAULT 0;
```

---

### 3.4. Opciones y Presupuesto para Calificaciones y Likes

Ofrecemos tres alternativas claras de contratación:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        OPCIONES DE IMPLEMENTACIÓN SOCIAL PROOF                         │
├────────────────────────────────────┬───────────────────────────────────────────────────┤
│ Opción A: Sistema de Estrellas y   │ • Enlace único WhatsApp para compradores reales   │
│ Calificaciones Verificadas         │ • Renderizado en Ficha (Captura 1) y Cards (Cap 2)│
│ (Requerimiento literal capturas)   │ • Panel Admin: Generador de links + Moderación    │
│                                    │ • Inyección JSON-LD AggregateRating (SEO)         │
│                                    │ Inversión: S/ 1,950 PEN                           │
├────────────────────────────────────┼───────────────────────────────────────────────────┤
│ Opción B: Sistema de Likes /       │ • Botón de corazón interactivo con microanimación │
│ Favoritos Estilo Falabella         │ • Almacenamiento local en navegador (sin login)   │
│ (Wishlist complementaria)          │ • Botón en Header: "Mis Favoritos"                │
│                                    │ • CTA: "Consultar mis 3 favoritos por WhatsApp"   │
│                                    │ Inversión: S/ 850 PEN                             │
├────────────────────────────────────┼───────────────────────────────────────────────────┤
│ Opción C: Paquete Completo Social  │ • Opción A (Calificaciones Verificadas)           │
│ Proof Falabella                    │ • Opción B (Favoritos / Wishlist WhatsApp)        │
│ (Combo Integrado Recomendado)      │ Inversión con Descuento: S/ 2,450 PEN             │
│                                    │ (Ahorro de S/ 350 frente a contratos separados)   │
└────────────────────────────────────┴───────────────────────────────────────────────────┘
```

#### Detalle de la Opción A: Calificaciones Verificadas (S/ 1,950.00 PEN)
* **Alcance:**
  1. Base de datos: Creación de tablas en Supabase, funciones y triggers para mantener el promedio de estrellas sincronizado en tiempo real.
  2. Endpoints seguros en Cloudflare Workers: Validación de tokens criptográficos, prevención de inyecciones maliciosas y protección contra spam.
  3. Página pública de calificación `/calificar/[token]`: Diseño limpio, optimizado para celulares, con selector de 5 estrellas intuitivo.
  4. Integración en UI Ficha de Producto (Captura 1): Bloque de estrellas bajo el precio, total de valoraciones y listado inferior de testimonios verificados.
  5. Integración en UI Tarjeta de Producto (Captura 2): Inserción visual de estrellas entre el nombre y el precio en Home, Catálogo y carruseles sugeridos.
  6. Módulo en Panel Administrativo: Generador de links para enviar por WhatsApp y tabla de administración para aprobar/ocultar comentarios.
  7. Conexión directa con Google Rich Snippets (`AggregateRating`).
* **Tiempo estimado de desarrollo:** 10 a 14 días hábiles.

#### Detalle de la Opción B: Likes / Favoritos Estilo Falabella (S/ 850.00 PEN)
* **Alcance:**
  1. Botón interactivo de corazón en la esquina de cada tarjeta de producto y al lado del botón de WhatsApp en la ficha de detalle.
  2. Persistencia en `localStorage` (los productos guardados permanecen en el celular del cliente sin necesidad de crearse una cuenta).
  3. Contador de favoritos en el Header superior al lado del buscador.
  4. Ventana emergente (Drawer) de favoritos con botón directo: *"Cotizar mis productos seleccionados por WhatsApp"*.
* **Tiempo estimado de desarrollo:** 5 a 6 días hábiles.

#### Detalle de la Opción C: Paquete Completo Social Proof (S/ 2,450.00 PEN)
* Integra la **Opción A** y la **Opción B** en una sola entrega técnica coordinada, otorgando a Barzol una experiencia de compra comparable a las plataformas líderes del mercado nacional.

---

## 4. Módulo 3: Matriz de Paquetes Comerciales Recomendados

Para facilitar la toma de decisiones, se presentan combinaciones integrales que maximizan la rentabilidad y el impacto comercial:

| Paquete | Componentes Incluidos | Inversión Total (PEN) | Tiempo Estimado | Perfil de Negocio Ideal |
| :--- | :--- | :--- | :--- | :--- |
| **Paquete 1: Esencial de Entrada** | • SEO Nivel 1 (Técnico & Fundacional)<br>• Opción B (Likes / Favoritos Falabella) | **S/ 1,650.00** *(antes S/ 1,800)* | 10 a 12 días | Negocio que busca ordenar su indexación técnica y dar interactividad básica al catálogo con bajo presupuesto. |
| **Paquete 2: E-Commerce Profesional (RECOMENDADO)** | • **SEO Nivel 2 (Avanzado + Rich Snippets + Search Console)**<br>• **Opción A (Calificaciones Verificadas WhatsApp - Capturas 1 y 2)** | **S/ 3,450.00** *(antes S/ 3,800)* | 15 a 18 días | **La opción estratégica.** Garantiza que las estrellas de los clientes verificados aparezcan en Google y en la tienda web, impulsando directamente la confianza y las ventas por WhatsApp. |
| **Paquete 3: Elite 360° & Máxima Conversión** | • **SEO Nivel 3 (Integral + Local Maps + Analítica WhatsApp)**<br>• **Opción C (Calificaciones Verificadas + Favoritos Falabella)** | **S/ 5,100.00** *(antes S/ 5,650)* | 22 a 26 días | Para Barzol como empresa líder: dominio de búsquedas en Google en todo el Perú, optimización de Google Maps, medición de retorno y suite social completa. |

*Nota: Todos los precios están expresados en Soles Peruanos (PEN / S/) y no incluyen impuestos de ley en caso de requerir comprobante fiscal institucional.*

---

## 5. Cronograma de Trabajo y Fases de Ejecución

Tomando como base el **Paquete 2 (Recomendado)**, el desarrollo se estructura en cuatro fases deterministas:

```
SEMANA 1: ARQUITECTURA & BASE DE DATOS
├── Modelado DDL en Supabase (tablas product_review y tokens)
├── Triggers de agregación de estrellas y promedio
├── Endpoints de Cloudflare Workers (/api/calificaciones)
└── Setup del endpoint de Sitemap dinámico (/sitemap.xml) y robots.txt

SEMANA 2: DESARROLLO FRONTEND & REVIEWS
├── Maquetación del formulario mobile /calificar/[token]
├── Inserción de estrellas en ProductoView.astro (Captura 1)
├── Inserción de estrellas en ProductCard.astro (Captura 2)
└── Estilos CSS nativos de tokens Barzol (Zero-JS SSR)

SEMANA 3: PANEL ADMIN & SEO ESTRUCTURADO
├── Módulo de generación de enlaces WhatsApp en /admin
├── Interfaz de moderación y aprobación de comentarios
├── Inyección de JSON-LD Schema.org (Product, Offer, AggregateRating)
└── Pruebas de Rich Results Test de Google

SEMANA 4: VERIFICACIÓN, TESTING & DESPLIEGUE
├── Configuración de Google Search Console y envío de sitemap
├── Pruebas de compatibilidad móvil y accesibilidad WCAG 2.2 AA
├── Verificación de compilación en Cloudflare Pages (`npm run build && npm run preview`)
└── Pase a producción y capacitación al fundador (William Barzola)
```

---

## 6. Condiciones Comerciales y Garantía Técnica

1. **Forma de Pago:**
   * **50% al inicio:** Para iniciar el modelado de base de datos, arquitectura de endpoints y desarrollo de interfaces.
   * **50% contra entrega:** Tras la verificación en entorno de pruebas, despliegue exitoso en Cloudflare Pages y validación de funcionalidades en vivo.
2. **Garantía y Soporte Técnico:**
   * **30 días de garantía sin costo adicional:** Cubre cualquier anomalía, ajuste menor o corrección de bugs sobre los componentes desarrollados.
   * La infraestructura respeta rigurosamente las reglas del proyecto: compatibilidad con el runtime de Cloudflare (`workerd`), tipado estricto en TypeScript, diseño industrial responsive y estándar de cero JavaScript innecesario en el navegador.
3. **Requisitos Previos a cargo del Cliente:**
   * Acceso como propietario o administrador al dominio web y a la cuenta de Google para la vinculación de Google Search Console.
   * Validación de textos comerciales de catálogo durante la etapa de afinamiento SEO.

---

## 7. Decisión y Siguientes Pasos

Para proceder con la implementación, se solicita al cliente indicar:
1. El **Nivel de SEO** seleccionado (Nivel 1, Nivel 2 o Nivel 3).
2. La **Modalidad de Calificaciones/Likes** elegida (Opción A: Calificaciones Verificadas, Opción B: Favoritos, u Opción C: Paquete Completo).
3. Fecha estimada de inicio de actividades.

*Documento preparado por el Equipo de Arquitectura de Sistemas y Desarrollo Fullstack.*
