# GLOSARIO DE DOMINIO — barzol-web

> Anclado a `src/shared/types/index.ts`, `DATABASE_SCHEMA.md` y `BARZOL_CONTEXTO.md`.
> Si un término del código no está aquí, o está aquí con otro significado, uno de
> los dos está mal. Arreglar el desacuerdo es parte del trabajo, no un extra.

---

## Negocio

**Barzol 3D Industry S.A.C.** — Empresa de Ayacucho, Perú. Fabrica accesorios para
instrumentos de viento por impresión 3D. Precios en **soles peruanos (PEN)**.

**Tudel** — Tubo curvo que conecta la boquilla al cuerpo del instrumento en
trombones y tubas. **Es una dimensión de producto, no un producto**: los soportes
se fabrican en versión *tudel delgado* y *tudel ancho*, y son piezas distintas que
no se intercambian. Un cliente que pide "el soporte de tuba" sin especificar el
tudel está pidiendo algo ambiguo.

**Sordina** (silenciador) — Pieza que se inserta en la campana del instrumento para
atenuar el volumen. Categoría comercial propia en el menú del sitio.

**BERP** — *Buzz Extension Resonance Piece*. Accesorio de estudio que permite
practicar el zumbido de labios con la boquilla acoplada al instrumento. Se fabrica
para trombón, trompeta y euphonium.

**Soporte de celular / atril** — La familia de producto más vendida. Se sujeta al
instrumento para sostener el móvil con la partitura.

---

## Modelo de datos

> Las tablas están en inglés (`product`, `category`); los tipos de dominio en
> español (`Product`, `Category`). La traducción vive **solo** en los `*Mapper.ts`.
> Esa asimetría es deliberada y está documentada en `DATABASE_SCHEMA.md`.

**`code` / `codigo`** — Entero autogenerado. Identificador **interno de inventario**
(SKU de almacén). **Ya no es la base del slug público**, aunque sí se anexa al final
de la URL del producto para desambiguar. Confundirlo con el slug es el error clásico
en este repo.

**`slug`** — Cadena derivada del `nombre`, **no se persiste**: se calcula en el
mapper en cada lectura. Es la única fuente de verdad de la navegación pública
(`/catalogo/[slug]`). Consecuencia directa: **renombrar una categoría en el admin
cambia su URL pública**, sin aviso y sin redirección. Ver `SPEC-003`.

**Categoría / Subcategoría** — `category` es autorreferenciada
(`parent_category_id`), profundidad libre. En el dominio se aplana a dos niveles:
la **categoría** es el instrumento (trompeta, trombón) y la **subcategoría** el tipo
de accesorio (sordinas, soportes).
`product.category_id` es la **única** FK y puede apuntar a cualquiera de los dos
niveles; el mapper deriva el instrumento subiendo por `parent_category_id`. Si la
categoría hoja no tiene padre, **ella misma es el instrumento** y no hay
subcategoría.

**`status` / `publicado`** — Enum nativo `'draft' | 'published'`. Un producto en
`draft` **no debe ser legible por el rol `anon`**. Es un requisito de RLS, no de la
capa de aplicación: si RLS no lo impide, un `curl` a PostgREST lo lee aunque la web
lo oculte. Ver `SPEC-902`.

**`is_active` / `activo`** — Distinto de `publicado`. Un producto puede estar
publicado y descatalogado.

**`precio` / `precioOriginal`** — `price` y `original_price` en Postgres, tipo
`numeric`. **Hoy llegan al dominio como `number` decimal.** La Constitución (Regla
3) exige céntimos enteros dentro de la lógica pura; la conversión ocurre en el
mapper. La migración del tipo en base de datos está sin decidir (`BZ-63`).

**Oferta** — Estado derivado, **no una columna**. Hay oferta cuando
`precioOriginal` existe y es estrictamente mayor que `precio`. Es lo que produce el
precio tachado en la ficha. Ver `SPEC-001`.

**`vendor`** — Marca o proveedor. Existe porque el catálogo incluye piezas de
terceros además de las fabricadas por Barzol.

---

## Plataforma

**Worker** — El despliegue completo del sitio en Cloudflare Workers con static
assets. URL de producción:
`https://barzol-web.willymichael-cardenas.workers.dev/`. **No es Cloudflare Pages**;
el proyecto de Pages homónimo que quedó de un intento anterior es una fuente
recurrente de confusión en el panel (fue la causa raíz de `BZ-49`).

**`MEDIA`** — Binding del bucket R2 `barzol-web`. Todo el contenido multimedia.
Se accede **sin credenciales S3**: el permiso lo concede la plataforma.

**`ASSETS`** — Binding de los estáticos construidos en `./dist`.

**`SESSION`, `IMAGES`** — Bindings que inyecta `@astrojs/cloudflare` v14 por su
cuenta: no están en `wrangler.jsonc` pero sí aparecen en `/api/diagnostico`. Los
tests de Capa 3 deben declararlos en Miniflare o el entorno de prueba diverge del
real.

**Media key** — Ruta del objeto dentro de R2:
`carpeta/AAAA/MM/<uuid>-<nombre-limpio>`. La carpeta es un enum cerrado
(`productos`, `galeria`, `home`) precisamente porque el nombre llega desde el panel
admin, que es entrada hostil. Ver `SPEC-002`.

**`/api/diagnostico`** — Endpoint de auto-diagnóstico: informa qué variables llegan
al worker, qué bindings existen, si Supabase responde y qué commit generó el bundle.
Fue la herramienta que cerró el hilo del despliegue. **Hoy es público**, lo cual es
una fuga de información (`BZ-37`) y bloquea usarlo como sonda de CI (`BZ-72`).

---

## Proceso SDD

**SPEC** — Documento en `.sdd/specs/`. Describe **qué** debe pasar, en EARS. No
contiene implementación.

**PLAN** — Documento en `.sdd/plans/`. Matriz cerrada de casos de prueba derivada de
una SPEC. Es el contrato de la fase RED.

**EARS** — *Easy Approach to Requirements Syntax*. Cinco plantillas:

| Tipo | Plantilla |
| :--- | :--- |
| Ubicuo | El sistema DEBE `<respuesta>` |
| Dirigido por evento | CUANDO `<disparador>`, el sistema DEBE `<respuesta>` |
| Dirigido por estado | MIENTRAS `<estado>`, el sistema DEBE `<respuesta>` |
| No deseado | SI `<condición>`, ENTONCES el sistema DEBE `<respuesta>` |
| Opcional | DONDE `<característica>`, el sistema DEBE `<respuesta>` |

Un requisito ubicuo **no lleva condición**. Si la lleva, es dirigido por estado o
por evento. La precisión importa: cuando el vocabulario formal es aproximado, el
agente lo lee como prosa y vuelve a inventar.

**Deriva arquitectónica** — Rama de código que no rastrea a ningún REQ. Se detecta
recorriendo el código rama por rama, no ejecutando tests: los tests pasan y la
deriva entra igual.

**Gate** — Comprobación automática que bloquea el avance. Un gate que se puede
saltar con `--no-verify` y nadie revisa no es un gate, es un comentario.
