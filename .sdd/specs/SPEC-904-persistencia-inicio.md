# SPEC-904 — Persistencia de la página de inicio

**Estado:** BORRADOR — **pendiente de aprobación humana**
**Capa:** 1 (servicios) + 3 (endpoints) + presentación · **Fecha:** 2026-08-25
**Unidades destino:** `src/shared/lib/home/homeService.ts` (ampliar),
`src/pages/api/inicio/**` (**no existe**), `src/admin/inicio/InicioAdmin.tsx`
**Abre:** `BZ-81` · **Toca:** `BZ-77` (base64), `BZ-79` (835 líneas), `BZ-80` (borradores)

---

## Contexto — el CRUD no falla, no existe

Reportado el 2026-08-25: agregar un producto a una sección del inicio, pulsar
**Guardar cambios**, recargar, y el producto no está.

No es un fallo del CRUD. Es que **no hay CRUD**. El botón muestra un toast de
éxito y no envía nada:

```tsx
// src/admin/inicio/InicioAdmin.tsx:293
function confirmSaveChanges() {
  // TODO: reemplazar por @shared/lib/home/homeService cuando se conecte Supabase.
  clearTimeout(savedToastTimer.current);
  setSaveConfirmOpen(false);
  setShowSavedToast(true);
  setDirty(false);
  savedToastTimer.current = setTimeout(() => setShowSavedToast(false), 2200);
}
```

`InicioAdmin.tsx` tiene **cero llamadas a `fetch`**. `ProductsAdmin` tiene 3,
`CategoriesAdmin` 1, `GalleryAdmin` 1. Es el único panel que no habla con el
servidor.

Los logs de Cloudflare Observability lo confirman desde fuera: en toda la
ventana del incidente solo hay peticiones `GET`. No hay `POST` ni `PUT` que
revisar — el navegador nunca los emitió.

### Faltan cuatro capas, no una

| Capa | Estado |
| :--- | :--- |
| UI · `confirmSaveChanges()` | stub con `TODO` |
| Endpoint · `src/pages/api/inicio/**` | **no existe** |
| Servicio · `homeService.ts` | solo `getHeroImages()` y `getHomeItems()` |
| Base · policies `"admin write"` | **ausentes** en `home_item`, `home_hero_image`, `home_section_product` |

La última la documenta el propio esquema en `supabase/schema.sql:339`:

```sql
-- Pendiente (CRUD todavía no implementado para esas pantallas):
-- home_hero_image, home_item, home_section_product, vendor.
```

Las tres tablas tienen `enable row level security` y solo policy de `select`.
Aunque el código existiera, la escritura moriría en un default-deny.

### La gravedad no es la pérdida, es la mentira

Perder un cambio no guardado es molesto. Lo grave es que el panel **afirma**
haberlo guardado: enseña el toast verde y además pone
`window.__adminHasUnsavedChanges = false`, así que el guardia de navegación
tampoco avisa al salir. El usuario no tiene ninguna señal de que perdió trabajo
hasta que recarga, y para entonces lo atribuye a otra cosa. Un fallo ruidoso
habría costado minutos; éste lleva abierto desde que se escribió la pantalla.

---

## Fuera de alcance

- Reordenar por *drag and drop* con persistencia optimista. El orden se envía
  entero al guardar, no en cada arrastre.
- CRUD de `vendor`, que comparte el mismo hueco pero no tiene pantalla.
- Partir `InicioAdmin.tsx` (835 líneas). Es `BZ-79` y necesita `BZ-60` antes.
- Cambiar el modelo de datos de `home_item` / `home_section_product`.

---

## Requisitos (EARS)

### [REQ-970] — No deseado · **el requisito que se implementa primero**
SI el guardado no se ha confirmado contra el servidor, ENTONCES el sistema NO
DEBE mostrar confirmación de éxito NI DEBE limpiar
`window.__adminHasUnsavedChanges`.

> Es independiente del resto y es lo único que hoy convierte un fallo en pérdida
> silenciosa. Se puede satisfacer antes que REQ-971..979 existan.

### [REQ-971] — Dirigido por evento · guardar
CUANDO el administrador confirme el guardado, el sistema DEBE enviar el estado
completo de la página de inicio —imágenes hero, secciones, banners, su orden y
los productos de cada sección— en **una sola** petición `PUT /api/inicio`.

> Entero y no por partes: el orden es una propiedad del conjunto. Media
> actualización deja el inicio en un estado que nadie pidió.

### [REQ-972] — Ubicuo · atomicidad
El sistema DEBE aplicar la actualización de forma que, ante un fallo parcial, la
página de inicio quede como estaba antes de la petición.

### [REQ-973] — Dirigido por evento · confirmación honesta
CUANDO el servidor responda `success`, ENTONCES el sistema DEBE mostrar la
confirmación y marcar el formulario como limpio. SI responde error, ENTONCES
DEBE mostrar el mensaje del servidor y **mantener** el estado sucio.

### [REQ-974] — Ubicuo · identidad de producto
El sistema DEBE referenciar los productos por su `id`, no por su nombre.

> Hoy la isla los guarda como `string[]` de nombres (`InicioView.astro` los
> traduce al entrar). Devolver nombres obliga a resolverlos contra la base al
> escribir, y el catálogo real ya contiene *"Soporte de Celular Trompeta"* y
> *"Soporte de Celular Trompeta (copia)"*. Una resolución por nombre es una
> ambigüedad esperando a que alguien renombre un producto.

### [REQ-975] — Ubicuo · imágenes en R2
El sistema DEBE subir toda imagen del inicio —hero y banner— por
`POST /api/media` y DEBE persistir la clave de R2. NO DEBE persistir `data:` URIs.

> `InicioAdmin.tsx` usa `readFileAsDataURL()` en dos sitios (líneas 146 y 205).
> Conectar el guardado sin tocar esto grabaría el base64 dentro de
> `home_hero_image.image_url` y lo serviría en cada visita a la portada. Es
> `BZ-77`, y este cambio lo empeoraría en vez de heredarlo.

### [REQ-976] — Ubicuo · cliente autenticado
Los endpoints DEBEN escribir con `locals.supabase`, el cliente de la sesión, y
NO DEBEN usar el singleton anónimo de `@shared/lib/db/client`.

> Es lo que ya hacen `galeria`, `productos`, `categorias` y `configuracion`. Sin
> esto, `auth.uid()` es nulo y las policies de REQ-979 rechazan la escritura.

### [REQ-977] — No deseado · validación
SI el cuerpo de la petición no cumple el esquema, ENTONCES el sistema DEBE
responder `400` con el detalle y NO DEBE tocar la base.

### [REQ-978] — No deseado · secciones sin título
SI una sección llega con el título vacío, ENTONCES el sistema DEBE rechazarla en
el servidor.

> La isla ya lo valida en el cliente. Duplicarlo en el servidor no es "por si
> acaso": el endpoint es alcanzable sin pasar por la isla.

### [REQ-979] — Ubicuo · policies
La base DEBE tener policy `"admin write"` en `home_item`, `home_hero_image` y
`home_section_product`, con el mismo predicado que las seis tablas que ya la
tienen.

---

## Contrato

```typescript
// PUT /api/inicio — cuerpo
interface InicioWriteInput {
  heroImages: (string | null)[];        // claves de R2, nunca data:
  items: Array<
    | { tipo: 'section'; titulo: string; visible: boolean; productoIds: string[] }
    | { tipo: 'banner'; visible: boolean; link: string; imagenUrl: string | null }
  >;                                     // el índice del array ES el orden
}
```

Archivos que esta SPEC autoriza a crear o modificar:

| Archivo | Qué |
| :--- | :--- |
| `src/shared/lib/home/homeService.ts` | `updateInicio(cliente, input)` |
| `src/shared/lib/validation/inicioSchema.ts` | esquema Zod (REQ-977, REQ-978) |
| `src/pages/api/inicio/index.ts` | `PUT` (REQ-971, REQ-976) |
| `src/admin/inicio/InicioAdmin.tsx` | REQ-970, REQ-973, REQ-975 |
| `supabase/pendiente-policies-home.sql` | REQ-979 — **sin aplicar** |

`homeService.ts` queda en ~120 líneas; si el escritor lo empujara por encima de
500, la escritura sale a `homeWriter.ts` (Regla 9.1).

## Invariantes verificables

- **INV-1:** Ninguna ruta del código muestra confirmación sin respuesta `success`.
- **INV-2:** Ningún valor persistido en `image_url` empieza por `data:`.
- **INV-3:** Recargar tras un guardado exitoso reproduce exactamente lo guardado.
- **INV-4:** El endpoint no importa `getSupabase`.

---

## Plan de pruebas

| Test | REQ | Capa | Qué prueba |
| :--- | :--- | :--- | :--- |
| TEST-500 | REQ-970 | 1 | el guardado sin confirmación no limpia el estado sucio |
| TEST-501 | REQ-977 | 1 | el esquema rechaza `productoIds` vacío de tipo, títulos ausentes |
| TEST-502 | REQ-978 | 1 | el esquema rechaza sección con título en blanco |
| TEST-503 | REQ-974 | 1 | el mapper de escritura emite `product_id`, nunca nombres |
| TEST-504 | REQ-975 | 1 | una `data:` URI se rechaza en validación |
| TEST-505 | REQ-971 | 3 | `PUT /api/inicio` persiste secciones, banners y orden |
| TEST-506 | REQ-972 | 3 | un item inválido en medio del lote no deja nada escrito |
| TEST-507 | REQ-973 | 3 | error del servidor → la respuesta no dice `success` |
| TEST-508 | REQ-976 | 3 | el endpoint escribe con el cliente de `locals` |

REQ-979 no se prueba con Vitest: es estado de la base. Lo cubre pgTAP (`BZ-70`).

---

## Orden propuesto — por fases, como `BZ-72`

1. **REQ-970 solo.** Sin endpoint, sin base, sin migración. Convierte la pérdida
   silenciosa en un aviso visible. Reversible en un commit.
2. **REQ-979.** SQL aditivo, aplicable solo, no quita permisos a nadie.
3. **REQ-971..978.** El CRUD, ya con la base preparada y el fallo siendo ruidoso.

La fase 1 es un cambio de comportamiento visible para el administrador: el botón
pasa de "parece que guarda" a "dice que todavía no puede". Es peor de usar y más
honesto, y es exactamente la información que faltaba ayer.
