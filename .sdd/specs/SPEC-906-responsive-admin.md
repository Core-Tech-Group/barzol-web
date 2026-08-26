# SPEC-906 — Responsive del panel de administración

**Estado:** APROBADA · aprobada por el responsable el 2026-08-26
**Capa:** Presentación + gate · **Fecha:** 2026-08-26
**Unidades destino:** `src/shared/styles/tokens.css`, `src/admin/**`,
`scripts/sdd/responsive.mjs`
**Abre:** `BZ-83` · **Toca:** `BZ-74` (E2E), `BZ-79` (componentes largos)

---

## Contexto — el panel se quedó a medio camino

El trabajo responsive del admin existe, pero se hizo **una vez, para el
esqueleto**, y nunca para las pantallas donde se trabaja.

Lo que sí está resuelto:

- Sidebar off-canvas con hamburguesa a ≤768 px, y las seis pantallas la pintan.
- `.bz-topbar` y `.bz-content-pad` bajan su padding en móvil.
- El Resumen adapta su rejilla de tarjetas: 3 → 2 → 1.
- Los chips de filtro de Productos ya llevan `overflowX: 'auto'`.

Y el número que resume lo que falta:

| | Media queries | Archivos |
| :--- | ---: | ---: |
| `src/landing/**` | **18** | 12 |
| `src/admin/**` | **3** | 2 (y dos de las tres son del Resumen) |

Productos, Categorías, Página de inicio, las dos Galerías, Configuración y el
**Login** no tienen ni una. No es que estén mal adaptadas: no están adaptadas.

## Lo que se rompe, en orden de gravedad

### 1 · `height: 100vh` con `overflow: hidden` — funcional

```html
<!-- AdminLayout.astro:39 -->
<div style="height:100vh; display:flex; overflow:hidden;">
```

El contenido scrollea en un hijo con `flex:1; overflow-y:auto`, y el padre está
en `overflow:hidden`. En un navegador móvil con barra dinámica, `100vh` es la
altura **máxima** del viewport, no la visible: unos 60–100 px del panel quedan
permanentemente debajo de la barra del navegador, y como el padre no scrollea,
**no hay forma de alcanzarlos**. Afecta a los botones que viven al final del
contenido.

### 2 · Reordenar es imposible en táctil — funcional

Siete superficies usan `draggable` de HTML5 con `dragstart`/`dragover`/`drop`:
Categorías (2), Página de inicio (2), Productos (2), Galería (1). **Ninguna
tiene alternativa táctil**, y esos eventos no existen en móvil. El orden de los
productos de una sección, de las fotos de la galería y de las secciones del
inicio solo se puede cambiar desde un ratón.

### 3 · El login se parte en dos columnas de 187 px — funcional

```html
<!-- LoginView.astro:14 -->
<div style="min-height:100vh; display:grid; grid-template-columns:1fr 1fr;">
```

Sin ninguna media query en el archivo. Es la primera pantalla que ve cualquiera,
y en un teléfono muestra el panel de marca —con un `<h1>` de 32 px— y el
formulario aplastados uno al lado del otro.

### 4 · La tabla de Productos, cinco columnas sin punto de ruptura

`gridTemplateColumns: '2.6fr 1.1fr 1fr 0.8fr 90px'` en la cabecera y en cada
fila. No desborda —las `fr` encogen— pero por debajo de ~700 px cada columna
queda en unas decenas de píxeles y la tabla deja de poder leerse.

### 5 · Rejillas de 3 columnas fijas

`repeat(3, 1fr)` en las imágenes hero del inicio y en las tarjetas de las
galerías. En un teléfono son tres celdas de ~100 px.

### 6 · Barras superiores de alto fijo

`height: 68` sin `flex-wrap`. En Página de inicio conviven el título, el aviso
*"Cambios sin guardar"* y tres botones.

### 7 · No hay vocabulario de puntos de ruptura

El `768px` está escrito como literal en dos archivos distintos, y `tokens.css`
ya documenta —para la landing— por qué eso es un problema:

> *"Se define una sola vez aquí porque los `<style>` de Astro son scoped por
> componente: si cada uno redeclarara esta regla, tendríamos la misma media
> query repetida en varios archivos."*

El panel nunca aplicó esa lección.

---

## Fuera de alcance

- Rediseñar el panel. Esto adapta lo que hay.
- Partir los componentes largos (`BZ-79`).
- Reordenar por táctil y verificación visual — se mudan a [SPEC-907](SPEC-907-panel-tactil.md).
- Landing pública: ya tiene sus 18 media queries.

---

## Requisitos (EARS)

### [REQ-990] — Ubicuo · altura real del viewport
El panel DEBE usar la altura **visible** del viewport para su contenedor raíz, y
NO DEBE dejar contenido fuera de alcance cuando la barra del navegador cambie de
tamaño.

> `100dvh` con `100vh` como declaración previa: los navegadores que no entiendan
> la unidad se quedan con el comportamiento de hoy, que es el que ya hay.

### [REQ-991] — Dirigido por estado · el login apila
MIENTRAS el ancho del viewport sea ≤768 px, el login DEBE mostrarse en una sola
columna y NO DEBE reservar espacio para el panel de marca.

### [REQ-992] — Dirigido por estado · la tabla de Productos se lee
MIENTRAS el ancho del viewport sea ≤768 px, la lista de productos DEBE
presentarse en una disposición legible que NO DEBE comprimir cinco columnas en
el ancho de un teléfono.

### [REQ-993] — Dirigido por estado · rejillas
MIENTRAS el ancho del viewport sea ≤768 px, las rejillas de tarjetas del panel
DEBEN reducirse a una columna; entre 769 y 1024 px, a dos.

> Mismo escalonado que ya usa el Resumen. No se inventa un tercer criterio.

### [REQ-994] — Dirigido por estado · barras superiores
MIENTRAS el contenido no quepa, la barra superior DEBE poder crecer en alto y
sus acciones DEBEN envolverse, en vez de recortarse.

### [REQ-995] — Ubicuo · un solo vocabulario
Los puntos de ruptura del panel DEBEN estar definidos en `tokens.css` y NO DEBEN
repetirse como literales en los componentes.

### [REQ-997] — Ubicuo · el gate lo vigila
El sistema DEBE verificar automáticamente los requisitos anteriores sobre
`src/admin/**` y DEBE fallar el gate ante una regresión.

> Esto es lo que impide que la próxima pantalla nazca sin adaptar, que es
> exactamente como llegamos aquí. Un documento que dice "acordate del móvil" no
> lo evita; un check que falla, sí.

## Lo que esta SPEC NO puede verificar — y por eso no lo promete

Dos requisitos se escribieron aquí y **se mudaron a
[SPEC-907](SPEC-907-panel-tactil.md)**, en borrador:

- **Sin desbordamiento horizontal a 360 px.** Hace falta un navegador con
  layout real. jsdom devuelve ceros: un test contra jsdom pasaría siempre.
- **Reordenar sin ratón.** Siete superficies usan `draggable` de HTML5, que no
  existe en táctil. Toca cuatro componentes, dos en el trinquete de `BZ-79`, sin
  capa de tests que los cubra.

El gate los reclamó por no tener test, y tenía razón: dejarlos en una spec
APROBADA obligaba a inventar un test que no prueba nada o a desactivar el check.
Son los dos síntomas que el tablero define como "SDD adoptado como decoración".

---

## Contrato

```css
/* src/shared/styles/tokens.css — utilidades compartidas del panel */
.bz-admin-shell   /* alto real del viewport (REQ-990) */
.bz-grid-cards    /* 3 → 2 → 1 columnas (REQ-993) */
.bz-topbar        /* + flex-wrap y alto mínimo (REQ-994) */
.bz-split-auth    /* login: 2 columnas → 1 (REQ-991) */
.bz-table-head    /* cabecera de tabla: se oculta en móvil (REQ-992) */
.bz-table-row     /* fila de tabla → tarjeta apilada (REQ-992) */
```

| Archivo | Qué |
| :--- | :--- |
| `src/shared/styles/tokens.css` | REQ-990..995 — todas las utilidades, en un sitio |
| `src/admin/layout/AdminLayout.astro` | REQ-990, REQ-994 |
| `src/admin/login/LoginView.astro` | REQ-991 |
| `src/admin/productos/ProductsAdmin.tsx` | REQ-992 |
| `src/admin/inicio/InicioAdmin.tsx` | REQ-993 |
| `src/admin/shared/GalleryAdmin.tsx` | REQ-993 |
| `src/admin/dashboard/DashboardView.astro` | REQ-995 — deja de redeclarar lo suyo |
| `scripts/sdd/responsive.mjs` | REQ-997 |
| `scripts/sdd-trace.mjs` | REQ-997 — cablea el check |

## Invariantes verificables

- **INV-1:** Ningún archivo de `src/admin/**` usa `100vh` para una caja que
  contenga el scroll del panel.
- **INV-2:** Ninguna rejilla de tarjetas de `src/admin/**` declara
  `repeat(3, 1fr)` sin una clase responsive que la gobierne.
- **INV-3:** El literal `768px` aparece en `tokens.css` y en ningún componente
  del panel.
- **INV-4:** El gate falla si alguno de los tres se incumple.

---

## Plan de pruebas

Lo que se prueba con Vitest es **el verificador**, no el aspecto de la página.
Decirlo así es parte de la spec: una hoja de estilos no tiene comportamiento que
un test unitario pueda observar, y montar jsdom para medir píxeles mediría jsdom.

| Test | REQ | Qué prueba |
| :--- | :--- | :--- |
| TEST-540 | REQ-997 | detecta `100vh` en una caja de scroll del panel |
| TEST-541 | REQ-997 | no marca `100vh` dentro de una media query de alto fijo |
| TEST-542 | REQ-997 | detecta `repeat(3, 1fr)` sin clase responsive |
| TEST-543 | REQ-997 | acepta la rejilla que sí lleva su clase |
| TEST-544 | REQ-997 | detecta un `768px` suelto en un componente del panel |
| TEST-545 | REQ-997 | no marca el `768px` de `tokens.css` |
| TEST-546 | REQ-990..995 | el propio repositorio pasa el verificador |
| TEST-547 | REQ-991, REQ-992 | la clase existe en tokens.css **y** está aplicada en el marcado |
| TEST-548 | REQ-994 | la barra superior puede envolver sus acciones |

**TEST-546 es el que vale.** Los cinco anteriores prueban el detector; ése
comprueba que el código real cumple, y es el que fallará el día que alguien
añada una pantalla sin adaptar.

Que el panel **se vea bien** solo lo pueden decir `BZ-74` (E2E con viewports) y
una persona con un teléfono. Queda anotado como hueco explícito, no disimulado.
