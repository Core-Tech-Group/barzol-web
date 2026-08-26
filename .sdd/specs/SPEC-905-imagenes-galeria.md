# SPEC-905 — Imágenes de la galería

**Estado:** APROBADA · aprobada por el responsable el 2026-08-26
**Capa:** 1 (lógica pura) + presentación · **Fecha:** 2026-08-26
**Unidades destino:** `src/shared/lib/galeria/imagenGaleria.ts` (**no existe**),
`src/admin/shared/GalleryAdmin.tsx`, `src/landing/servicios/GalleryLightbox.tsx`
**Abre:** `BZ-82` · **Toca:** `BZ-76` (degradación), `BZ-77` (base64), `BZ-11` (huérfanos)

---

## Contexto — no es el mismo bug que `BZ-81`

Reportado el 2026-08-26: las dos galerías del panel dejan añadir fotos, pero las
imágenes no se ven ni en el admin ni en `/servicios`.

**La persistencia funciona.** A diferencia de `BZ-81`, `GalleryAdmin` sí habla
con el servidor: hace `POST`, `PUT` y `DELETE` contra `/api/galeria`. El
problema es *qué* guarda.

```tsx
// src/admin/shared/GalleryAdmin.tsx:134
setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, image: file.name } : p)));
```

Guarda **el nombre del archivo**. El comentario de arriba lo dice sin rodeos:
*"lo que se guarda es solo el NOMBRE del archivo… Se resuelve del todo cuando se
conecte R2"*. La vista previa que ve el administrador es un `blob:` local que
muere al recargar la pestaña.

Verificado contra la base de producción el 2026-08-26 — las seis filas:

```
#1 [accessories] "firefox_ix0xISR5X0.png"  — Soporte grabado con nombre
#2 [accessories] "firefox_ix0xISR5X0.png"  — BERP personalizado en trombón
#3 [accessories] "firefox_ix0xISR5X0.png"  — Sordina con logo de banda
#4 [projects]    "firefox_BmzQRtw9Ue.png"  — Escaneo 3D de pieza original
#5 [projects]    "firefox_BmzQRtw9Ue.png"  — Diseño CAD/CAE de repuesto
#6 [projects]    "firefox_BmzQRtw9Ue.png"  — Pieza reconstruida por ingeniería inversa
```

Ninguna es una URL. Y el nombre se repite dentro de cada galería, que es lo que
pasa cuando el identificador de una imagen es el nombre que le puso el sistema
operativo a una captura de pantalla.

### El segundo hueco, independiente del primero

Aunque el admin guardara una URL correcta, **la galería pública seguiría sin
mostrarla**:

```tsx
// src/landing/servicios/GalleryLightbox.tsx:3
interface GalleryItem {
  name: string;
}
```

El componente no tiene campo de imagen. Pinta `<PhotoIcon />` siempre, en la
rejilla y en el lightbox. Y las dos vistas que lo alimentan tiran el dato antes
de dárselo:

```astro
.map((g) => ({ name: g.titulo }));   // ServiciosView.astro:10 · IngenieriaView.astro:11
```

Los cuadros grises de las capturas no son imágenes rotas: son el diseño
funcionando como se escribió. Nadie conectó nunca la imagen.

### Los datos, y por qué no hay SQL de reparación

Las seis filas no apuntan a nada recuperable: los archivos **nunca llegaron a
R2**, solo existieron como `blob:` en el navegador de quien los eligió. No hay
migración que las arregle — hay que volver a subir las fotos.

`gallery_item.image_url` es `text NOT NULL` (`schema.sql:183`), así que tampoco
se pueden dejar en `null` a la espera. La decisión es **no borrarlas**: los
títulos son contenido real y escrito a mano. El panel las marcará como imagen
inválida y exigirá reemplazarla antes de guardar, que es la vía que conserva el
trabajo del administrador.

---

## Fuera de alcance

- Recorte, rotación o reencuadre de imágenes.
- Limpiar objetos huérfanos de R2 (`BZ-11`, tablero hermano).
- Partir `GalleryAdmin.tsx`. Está en **471 líneas** y **no** está en el trinquete
  de `BZ-79`: si esta SPEC lo empuja por encima de 500, el gate bloquea. Es una
  restricción de esta tarea, no una tarea aparte.
- Cambiar el esquema de `gallery_item`.

---

## Requisitos (EARS)

### [REQ-980] — Dirigido por evento · subir de verdad
CUANDO el administrador elija un archivo para una tarjeta de la galería, el
sistema DEBE subirlo a R2 y DEBE conservar la **URL pública** que devuelva la
subida.

> Reutiliza `subirImagen()` de `uploadClient.ts`, escrita para `SPEC-904`
> REQ-975. Éste es el segundo uso previsto, y el motivo de que aquella no se
> resolviera con un helper local.

### [REQ-981] — No deseado · nada que no sea una URL
SI el valor de la imagen no es una URL absoluta `http(s)`, ENTONCES el sistema NO
DEBE persistirlo y DEBE responder `400`.

> Es la regla que convierte el bug de hoy en imposible. Un nombre de archivo, una
> ruta relativa y una `data:` URI caen todos por aquí.

### [REQ-982] — Ubicuo · la galería pública muestra la foto
El sistema DEBE renderizar la imagen de cada elemento de la galería en la
rejilla y en el lightbox.

### [REQ-983] — No deseado · degradación
SI la imagen falta, no es válida o no carga, ENTONCES el sistema DEBE mostrar el
marcador de posición y DEBE conservar el título, sin romper el resto de la
rejilla.

> `BZ-76` documenta dos imágenes de producto que devuelven 404 en producción y
> anota que *"hoy no hay nada"* que degrade con elegancia. Esta es la mitad de
> código de aquel hallazgo, resuelta para la galería.

### [REQ-984] — Dirigido por estado · el panel señala lo que está roto
MIENTRAS una tarjeta tenga una imagen ausente o inválida, el sistema DEBE
marcarla en el panel y DEBE impedir el guardado hasta que se reemplace.

> Sin esto, las seis filas malas de producción harían que `PUT /api/galeria`
> respondiera `400` al primer intento de corregir un título, y el administrador
> no sabría por qué. El bloqueo va **antes** de la petición y dice qué tarjeta es.

### [REQ-985] — Ubicuo · orden de escritura
El sistema DEBE ejecutar altas y modificaciones **antes** que los borrados.

> Misma razón que `SPEC-904` REQ-972: sin transacción disponible, el orden es lo
> único que impide que un fallo a media escritura deje la galería vacía.

### [REQ-986] — Dirigido por evento · el fallo se ve
CUANDO la subida o el guardado fallen, el sistema DEBE mostrar el mensaje del
servidor y NO DEBE marcar el formulario como limpio.

---

## Contrato

```typescript
// src/shared/lib/galeria/imagenGaleria.ts
export type EstadoImagen = 'ok' | 'ausente' | 'invalida';
export function estadoImagen(valor: string | null | undefined): EstadoImagen;
export function esUrlPublica(valor: string): boolean;

// src/admin/shared/guardarGaleria.ts
export interface PlanGaleria {
  crear: { titulo: string; imagenUrl: string; orden: number }[];
  actualizar: { id: string; titulo: string; imagenUrl: string; orden: number }[];
  borrar: string[];
}
export function planificarGaleria(iniciales, actuales): PlanGaleria;
export function guardarGaleria(tipo, plan, enviar?): Promise<void>;
```

Archivos que esta SPEC autoriza a crear o modificar:

| Archivo | Qué |
| :--- | :--- |
| `src/shared/lib/galeria/imagenGaleria.ts` | REQ-981, REQ-983 — decidir si una imagen sirve |
| `src/shared/lib/validation/galeriaSchema.ts` | REQ-981 en el borde del endpoint |
| `src/admin/shared/guardarGaleria.ts` | REQ-985 — el plan y su ejecución, fuera de la isla |
| `src/admin/shared/GalleryAdmin.tsx` | REQ-980, REQ-984, REQ-986 |
| `src/landing/servicios/GalleryLightbox.tsx` | REQ-982, REQ-983 |
| `src/landing/servicios/ServiciosView.astro` | pasar `imagenUrl` |
| `src/landing/servicios/IngenieriaView.astro` | pasar `imagenUrl` |
| `src/shared/lib/galeria/galeriaMapper.ts` | **no se modifica.** SPEC-905 fija que `GalleryItemRow.image_url` es la única fuente de la imagen y que el dominio la expone como `imagenUrl` |

`guardarGaleria.ts` existe por la Regla 9.1: `GalleryAdmin.tsx` está a 29 líneas
del límite y no tiene trinquete que lo cubra.

## Invariantes verificables

- **INV-1:** Ningún valor persistido en `gallery_item.image_url` deja de ser una
  URL absoluta `http(s)`.
- **INV-2:** La galería pública nunca renderiza un `<img>` con `src` vacío o no
  válido.
- **INV-3:** `GalleryAdmin.tsx` se mantiene por debajo de 500 líneas.
- **INV-4:** Un fallo de guardado deja `dirty` en `true`.

---

## Plan de pruebas

| Test | REQ | Capa | Qué prueba |
| :--- | :--- | :--- | :--- |
| TEST-520 | REQ-981 | 1 | `estadoImagen` clasifica URL, nombre de archivo, ruta relativa, `data:`, vacío y `null` |
| TEST-521 | REQ-981 | 1 | el caso real: `"firefox_ix0xISR5X0.png"` es `invalida` |
| TEST-522 | REQ-981 | 1 | el esquema Zod rechaza todo lo que no sea URL absoluta |
| TEST-523 | REQ-985 | 1 | el plan separa altas, cambios y borrados, y respeta el orden del array |
| TEST-524 | REQ-985 | 1 | `guardarGaleria` emite los borrados después de las escrituras |
| TEST-525 | REQ-986 | 1 | un error del servidor se propaga con su mensaje |
| TEST-526 | REQ-984 | 1 | una foto con imagen inválida cuenta como "falta subir" |
| TEST-527 | REQ-980 | 1 | el plan solo acepta URLs; una foto sin subir no llega a la petición |

REQ-982 y REQ-983 son de presentación y los cubre `BZ-74` (E2E). Se documentan
como hueco explícito en `TRACEABILITY.md` en vez de inventar un test que no
prueba nada.
