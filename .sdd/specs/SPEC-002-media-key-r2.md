# SPEC-002 — Claves de objeto en R2 (`buildMediaKey`)

**Estado:** APROBADA · implementada y verde el 2026-08-22
**Capa:** 1 (lógica pura) · **Fecha:** 2026-08-21
**Unidad existente:** `src/shared/lib/storage/mediaKey.ts`
**Tipo:** especificación **retroactiva** de código ya en producción

---

## Contexto

`buildMediaKey` decide dónde vive cada archivo dentro del bucket R2 `barzol-web`.
Es la función más pequeña del repo con la mayor superficie de ataque: su entrada
—el nombre del archivo— la elige quien sube desde el panel admin.

Se especifica retroactivamente porque **el código ya existe y ya corre**. La SPEC
documenta el comportamiento actual y marca explícitamente dónde ese comportamiento
viola la Constitución.

## Defecto conocido, especificado a propósito

`buildMediaKey` llama a `new Date()` y a `crypto.randomUUID()` internamente. Eso
viola la **Regla 6.1** (determinismo) y hace que la función sea imposible de probar
sin congelar el reloj global — que es justo el tipo de test frágil que la Regla 5
prohíbe.

**No se corrige en esta SPEC.** Se corrige en `BZ-62`, en su propio commit, con
`REQ-208` como contrato de destino. Especificar primero y corregir después es
deliberado: da un test de regresión antes de tocar código que ya funciona.

## Fuera de alcance

- La subida en sí (`mediaStorage.ts`, Capa 3 — ver `SPEC-005`, sin escribir).
- La URL pública resultante (`mediaUrl.ts`).
- Optimización de imagen (`imageOptimizer.ts`).

---

## Requisitos (EARS)

### [REQ-201] — Ubicuo
El sistema DEBE construir la clave con la forma
`<carpeta>/<AAAA>/<MM>/<uuid>-<nombre-limpio>`, donde `AAAA` y `MM` provienen del
calendario **UTC** y `MM` está rellenado a dos dígitos.

### [REQ-202] — Ubicuo
El sistema DEBE aceptar como carpeta únicamente uno de los valores del enum
cerrado `productos | galeria | home`.

> El enum es cerrado a propósito: aceptar texto libre en la carpeta permitiría
> escribir fuera del prefijo previsto. Esto ya está bien resuelto en el código
> actual y el REQ existe para que ningún refactor futuro lo relaje.

### [REQ-203] — Dirigido por evento
CUANDO el nombre de archivo contenga componentes de directorio (`/`, `\`, `../`,
`C:\`), el sistema DEBE descartarlos y conservar únicamente el último segmento.

### [REQ-204] — Ubicuo
El sistema DEBE normalizar el nombre a: sin diacríticos (NFD + eliminación de
marcas combinantes), en minúsculas, con todo carácter fuera de `[a-z0-9]`
colapsado a un único guion, y sin guiones al inicio ni al final.

### [REQ-205] — Dirigido por estado
MIENTRAS el nombre tenga extensión —entendida como un punto en posición mayor que
cero— el sistema DEBE normalizar base y extensión por separado y unirlas con un
punto. En caso contrario DEBE devolver solo la base normalizada.

### [REQ-206] — Ubicuo
El sistema DEBE truncar la base normalizada a **60 caracteres**, y DEBE sustituirla
por el literal `archivo` cuando la normalización la deje vacía.

### [REQ-207] — Ubicuo
El sistema DEBE anteponer el UUID al nombre, no anexarlo.

> El orden no es cosmético: en R2 un `PUT` sobre una clave existente sobrescribe
> sin avisar. Con el UUID delante, dos archivos llamados `foto.webp` nunca colisionan.

### [REQ-208] — Ubicuo · implementado en `BZ-62`
El sistema DEBE recibir el instante y el generador de identificadores como
dependencias inyectadas, con valores por defecto que preserven la firma actual:

```typescript
export interface MediaKeyDeps {
  ahora?: () => Date;          // por defecto: () => new Date()
  nuevoId?: () => string;      // por defecto: () => crypto.randomUUID()
}
export function buildMediaKey(
  folder: MediaFolder,
  fileName: string,
  deps?: MediaKeyDeps
): string;
```

El parámetro es opcional para que **ninguna llamada existente se rompa**. Esa es la
condición para que `BZ-62` no sea una regresión.

---

## Contrato actual (verificado en el código)

```typescript
export const MEDIA_FOLDERS = ['productos', 'galeria', 'home'] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export function sanitizeFileName(fileName: string): string;
export function buildMediaKey(folder: MediaFolder, fileName: string, deps?: MediaKeyDeps): string;
```

## Invariantes verificables

- **INV-1:** La clave nunca contiene `..`, ni `\`, ni dos `/` consecutivos.
- **INV-2:** La clave siempre empieza por uno de los tres valores de `MEDIA_FOLDERS`
  seguido de `/`.
- **INV-3:** `sanitizeFileName` es idempotente:
  `sanitize(sanitize(x)) === sanitize(x)`.
- **INV-4:** La longitud del segmento base nunca supera 60 caracteres.
- **INV-5 (tras REQ-208):** con `ahora` y `nuevoId` fijos, `buildMediaKey` es una
  función pura — misma entrada, misma salida, siempre.
