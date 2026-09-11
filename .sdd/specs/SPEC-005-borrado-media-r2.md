# SPEC-005 — Borrar de R2 las imágenes que dejan de usarse

**Estado:** BORRADOR
**Capa:** 1 lógica + 3 workerd
**Autor:** Claude (a pedido del responsable) · **Fecha:** 2026-09-11
**Abre:** `BZ-11` (versión simple) · **Toca:** `BZ-28` (dominio del bucket), `BZ-80` (borradores)
**Unidades destino:**
`src/shared/lib/storage/mediaEnDesuso.ts` (**no existe**) ·
`storage/mediaStorage.ts` · `productos/productoService.ts` ·
`galeria/galeriaService.ts` · `home/homeService.ts` ·
`src/pages/api/productos/[id].ts` · `src/pages/api/galeria/[id].ts` ·
`src/pages/api/inicio/index.ts`

---

## Contexto

La app no puede borrar un archivo de R2: en todo `src/` no hay ninguna llamada a
`bucket.delete`. Eliminar un producto borra sus filas en cascada
(`product_photo … ON DELETE CASCADE`), pero sus imágenes quedan en el bucket
para siempre. Lo mismo al quitar o reemplazar una foto de producto, de galería o
un banner del inicio. Es `BZ-11`, abierta desde el 2026-08-08.

`BZ-11` proponía además guardar la clave de R2 en la base. **Se descarta**
(decisión del responsable, 2026-09-11): la clave se deduce de la URL guardada
quitándole la base pública del bucket (`BARZOL_R2_PUBLIC_URL`). Guardar la clave
solo aporta si el dominio cambia, y para eso (`BZ-28`) alcanza con aceptar
también el prefijo anterior.

**Datos hoy (2026-09-11):** 5 imágenes están referenciadas por más de una fila,
todas de prueba o de duplicados previos al arreglo de "Duplicar". El
responsable decidió **no** verificar referencias compartidas —cada fila es
independiente—. Verificado el mismo día: **ninguna de las 5 está en el bucket
actual** (3 son de la cuenta vieja `pub-12c5…`, 2 externas), así que REQ-501 las
ignora y no hace falta limpiarlas antes de publicar.

## Fuera de alcance

- **Guardar la clave de R2 en la base** (la "versión completa" de `BZ-11`).
- **Varios prefijos a la vez**: el contrato los acepta, pero hoy solo se
  configura `BARZOL_R2_PUBLIC_URL`. Sumar el anterior es parte de `BZ-28`.
- **Verificar si otra fila usa la misma imagen** (decisión del responsable).
- **Limpiar los huérfanos que ya existen** en el bucket: es una tarea manual
  aparte.
- **Un endpoint público de borrado** (`DELETE /api/media`): el borrado ocurre
  solo dentro de los endpoints existentes, del lado del servidor.
- **Borrar en segundo plano** (`waitUntil`): se borra antes de responder.

## Vocabulario

- **Prefijo propio**: la base pública del bucket de este proyecto, hoy
  `BARZOL_R2_PUBLIC_URL` sin barra final.
- **Imagen en desuso**: una URL que la fila tenía antes de la escritura y ya no
  tiene después.

---

## Requisitos (EARS)

### Lógica pura

### [REQ-501] — Ubicuo · deducir la clave
El sistema DEBE obtener la clave de R2 de una URL solo cuando la URL empieza con
un prefijo propio seguido de `/` y el resto no está vacío; la clave es ese
resto, decodificado. En cualquier otro caso DEBE devolver `null`.

> Una URL externa, de la cuenta vieja (`pub-12c5…r2.dev`) o un nombre de archivo
> suelto no son del bucket: no hay nada nuestro que borrar.

### [REQ-502] — Ubicuo · qué quedó en desuso
El sistema DEBE calcular las imágenes en desuso como las URLs presentes antes y
ausentes después, sin repetidos y sin valores vacíos o nulos.

### Cuándo se borra

### [REQ-503] — Dirigido por evento · eliminar un producto
CUANDO se elimine un producto con éxito, el sistema DEBE borrar de R2 todas las
fotos que tenía.

### [REQ-504] — Dirigido por evento · editar un producto
CUANDO se edite un producto con éxito, el sistema DEBE borrar de R2 las fotos que
tenía antes y que ya no tiene.

### [REQ-505] — Dirigido por evento · eliminar una foto de galería
CUANDO se elimine un elemento de galería con éxito, el sistema DEBE borrar su
imagen de R2.

### [REQ-506] — Dirigido por evento · reemplazar una imagen de galería
CUANDO se edite un elemento de galería con éxito y su imagen cambie, el sistema
DEBE borrar de R2 la imagen anterior.

### [REQ-507] — Dirigido por evento · guardar la página de inicio
CUANDO se guarde la página de inicio con éxito, el sistema DEBE borrar de R2 las
imágenes de banners y de portada que dejaron de usarse.

> Hoy, en la práctica, solo los banners: la sección de imágenes de portada está
> comentada en el admin y el hero sale del repo (`src/assets/`). Las URLs de
> portada guardadas siguen viajando igual en cada guardado (`heroImages`), así
> que no quedan en desuso.

### Cómo se borra

### [REQ-508] — No deseado · la base falla
SI la escritura en la base falla, ENTONCES el sistema NO DEBE borrar nada de R2.

> Borrar primero y fallar después dejaría una fila apuntando a una imagen que ya
> no existe: una foto rota en el sitio. Al revés, lo peor es un huérfano, que es
> lo que ya pasa hoy.

### [REQ-509] — No deseado · R2 falla
SI el borrado en R2 falla, ENTONCES el sistema DEBE responder igual que si
hubiera tenido éxito y DEBE registrar el error con `logServerError`.

> Los cambios del administrador ya están guardados. Fallar la operación le haría
> reintentar algo que salió bien.

### [REQ-510] — No deseado · imagen ajena
SI una imagen en desuso no tiene clave según REQ-501, ENTONCES el sistema NO DEBE
intentar borrarla y NO DEBE tratarlo como error.

### [REQ-511] — Ubicuo · un solo borrado por operación
El sistema DEBE borrar todas las imágenes en desuso de una operación con **una
sola** llamada a R2, y ninguna si no hay claves que borrar.

> R2 acepta varias claves en `bucket.delete([...])`. Eliminar un producto con 5
> fotos es 1 llamada, no 5.

### [REQ-512] — Ubicuo · leer lo que se va a borrar
El sistema DEBE obtener las imágenes anteriores con el cliente autenticado del
administrador.

> No con el cliente anónimo: hoy lee borradores solo porque RLS se lo permite
> por error (`BZ-80`). Arreglado eso, eliminar un producto en borrador no
> encontraría sus fotos.

---

## Contrato

```typescript
// src/shared/lib/storage/mediaEnDesuso.ts — lógica pura, nuevo
/** REQ-501 */
export function claveDesdeUrl(url: string, prefijosPropios: readonly string[]): string | null;
/** REQ-502 */
export function urlsEnDesuso(
  antes: readonly (string | null | undefined)[],
  despues: readonly (string | null | undefined)[]
): string[];

// src/shared/lib/storage/mediaStorage.ts — adaptador (Regla 1.1)
export interface BorrarMediaDeps {
  bucket?: Pick<R2Bucket, 'delete'>;      // por defecto getMediaBucket()
  prefijos?: readonly string[];           // por defecto [BARZOL_R2_PUBLIC_URL]
  log?: typeof logServerError;
}
/** REQ-509/510/511 — nunca lanza. */
export function borrarMediaEnDesuso(
  urls: readonly string[],
  contexto: ContextoError,
  deps?: BorrarMediaDeps
): Promise<void>;

// Los servicios devuelven lo que la escritura dejó en desuso (REQ-512: leen con supabaseAuth)
deleteProducto(supabaseAuth, id): Promise<{ fotos: string[] }>;                              // REQ-503
updateProducto(supabaseAuth, id, input): Promise<{ id: string; fotosQuitadas: string[] }>;   // REQ-504
deleteGaleriaItem(supabaseAuth, id): Promise<{ imagenUrl: string | null }>;                   // REQ-505
updateGaleriaItem(supabaseAuth, id, input): Promise<{ item: GalleryItem; imagenAnterior: string | null }>; // REQ-506
updateInicio(supabaseAuth, entrada): Promise<{ imagenesQuitadas: string[] }>;                // REQ-507

// Los endpoints llaman a borrarMediaEnDesuso DESPUÉS de que el servicio
// resolvió sin error (REQ-508), y responden como hoy.
```

## Invariantes verificables

- **INV-1:** para todo prefijo `p` y clave no vacía `k`,
  `claveDesdeUrl(\`${p}/${k}\`, [p]) === k`.
- **INV-2:** `claveDesdeUrl(u, [p]) === null` para toda `u` que no empieza con
  `\`${p}/\``.
- **INV-3:** `urlsEnDesuso(xs, xs)` es `[]` para toda lista `xs`.
- **INV-4:** ninguna URL de `urlsEnDesuso(antes, despues)` aparece en `despues`.
- **INV-5:** `borrarMediaEnDesuso` no rechaza nunca su promesa, aunque el bucket
  lance.
- **INV-6:** tras un `DELETE /api/productos/[id]` que responde error, todos los
  objetos del bucket siguen existiendo.

## Riesgo de regresión

- **Una foto rota en el sitio** si se borra de R2 antes de que la base confirme
  (REQ-508), o si otra fila usaba la misma imagen. Esto último está aceptado por
  el responsable; las 5 compartidas de hoy no son del bucket actual y no se
  tocan (ver Contexto).
- **Borrar un objeto que no es de este proyecto** si la clave se deduce mal:
  REQ-501 exige coincidencia exacta con el prefijo propio.
- **Una operación que falla por culpa de R2** cuando la base ya guardó
  (REQ-509).
- **Eliminar un borrador sin borrar sus fotos** cuando se arregle `BZ-80`
  (REQ-512).
- **Cambiar el dominio del bucket (`BZ-28`) sin sumar el prefijo anterior**: las
  imágenes viejas dejarían de reconocerse y volverían a quedar huérfanas. No
  rompe nada visible, pero desactiva esta SPEC en silencio para esas imágenes.
