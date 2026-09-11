# PLAN DE PRUEBAS — SPEC-005 · Borrar de R2 las imágenes en desuso

**Archivos destino:**
`tests/unit/storage/mediaEnDesuso.test.ts` ·
`tests/unit/storage/borrarMediaEnDesuso.test.ts` ·
`tests/workers/api/borradoMedia.test.ts`
**Proyecto Vitest:** `unit` + `workers` · **Umbral:** Capa 1 ≥95 % líneas / ≥90 % ramas · Capa 3 ≥70 %
**Fuente:** [`../specs/SPEC-005-borrado-media-r2.md`](../specs/SPEC-005-borrado-media-r2.md)

---

## Matriz

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-130 | URL propia | `https://pub-x.r2.dev/productos/2026/09/a-b.webp`, prefijo `https://pub-x.r2.dev` | `productos/2026/09/a-b.webp` | REQ-501 |
| TEST-131 | Prefijo con barra final | prefijo `https://pub-x.r2.dev/` | la misma clave | REQ-501 |
| TEST-132 | Ajenas (`it.each`) | cuenta vieja `pub-12c5…`, dominio externo, `firefox_ix0x.png`, `/galeria/a.png`, `https://pub-x.r2.dev.evil.com/a`, solo el prefijo, `''` | `null` | REQ-501 |
| TEST-133 | Codificada | `…/galeria/2026/09/a%C3%B1o.webp` | `galeria/2026/09/año.webp` | REQ-501 |
| TEST-134 | Varios prefijos | URL del segundo prefijo | su clave | REQ-501 |
| TEST-135 | Desuso básico | antes `[A, B, C]`, después `[A, C]` | `[B]` | REQ-502 |
| TEST-136 | Sin cambios | misma lista | `[]` | REQ-502 |
| TEST-137 | Repetidos y vacíos | antes `[A, A, null, '', B]`, después `[]` | `[A, B]` | REQ-502 |
| TEST-138 | Reemplazo | antes `[A]`, después `[B]` | `[A]` | REQ-502 |
| TEST-139 | Una sola llamada | 3 URLs propias, bucket fake que registra | una llamada a `delete` con las 3 claves | REQ-511 |
| TEST-140 | Nada que borrar | `[]` o solo URLs ajenas | ninguna llamada a `delete` | REQ-510, REQ-511 |
| TEST-141 | Mezcla | 2 propias + 1 ajena | una llamada, con las 2 claves propias | REQ-510 |
| TEST-142 | R2 falla | bucket fake cuyo `delete` lanza | la promesa resuelve; el log recibe una entrada con el contexto | REQ-509 |
| TEST-W130 | Eliminar producto | producto con 2 fotos en `env.MEDIA` | `200`; los 2 objetos ya no existen | REQ-503 |
| TEST-W131 | Editar producto | quitar 1 de 3 fotos | `200`; solo ese objeto desaparece | REQ-504 |
| TEST-W132 | Eliminar foto de galería | elemento con su objeto | `200`; el objeto ya no existe | REQ-505 |
| TEST-W133 | Reemplazar imagen de galería | nueva URL | `200`; el objeto anterior ya no existe, el nuevo sí | REQ-506 |
| TEST-W134 | Editar galería sin cambiar imagen | solo el título | `200`; el objeto sigue existiendo | REQ-506 |
| TEST-W135 | Guardar inicio | se quita un banner | `200`; su objeto ya no existe | REQ-507 |
| TEST-W136 | La base falla | el fake de Supabase devuelve error al borrar | respuesta de error; todos los objetos siguen existiendo | REQ-508 |
| TEST-W137 | Imagen ajena | producto cuya foto es de la cuenta vieja | `200`; el bucket no cambia | REQ-510 |
| TEST-W138 | Borrador | eliminar un producto en `draft` | `200`; sus fotos ya no existen (se leyeron con el cliente autenticado) | REQ-512 |

> Prefijos: sin prefijo = capa 1 · `W` = workerd.

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-501 | TEST-130, TEST-131, TEST-132, TEST-133, TEST-134 | ⏳ |
| REQ-502 | TEST-135, TEST-136, TEST-137, TEST-138 | ⏳ |
| REQ-503 | TEST-W130 | ⏳ |
| REQ-504 | TEST-W131 | ⏳ |
| REQ-505 | TEST-W132 | ⏳ |
| REQ-506 | TEST-W133, TEST-W134 | ⏳ |
| REQ-507 | TEST-W135 | ⏳ |
| REQ-508 | TEST-W136 | ⏳ |
| REQ-509 | TEST-142 | ⏳ |
| REQ-510 | TEST-140, TEST-141, TEST-W137 | ⏳ |
| REQ-511 | TEST-139, TEST-140 | ⏳ |
| REQ-512 | TEST-W138 | ⏳ |

**Hueco declarado:** REQ-509 se prueba solo en capa 1, con un bucket falso
inyectado por `BorrarMediaDeps`. En workerd no hay forma de hacer fallar el
binding real sin mockearlo, y la Regla 5.1 lo prohíbe.

## Reglas para el agente

- No añadir casos fuera de esta matriz sin actualizar antes la SPEC.
- Prohibido `toMatchSnapshot()` (Constitución 5.5).
- **Regla 5.4.** TEST-139–142 afirman sobre lo que registra el bucket falso
  (claves recibidas, cantidad de llamadas) y sobre las entradas del log
  inyectado: son el comportamiento especificado (REQ-509/511) y no hay otra
  forma de observarlo en capa 1. Los tests `W` afirman sobre el **estado real
  del bucket** (`env.MEDIA.head(key)`), nunca sobre llamadas.
- **Regla 5.1.** Los tests `W` usan el binding `MEDIA` real de Miniflare. El
  bucket falso de TEST-139–142 es un doble del **puerto** `BorrarMediaDeps`
  (Regla 1.5), no del binding.
- **Regla 5.2.** Supabase se sustituye por el fake de `tests/fakes/`.
- Un solo `Act` por test (2.3). Estructura AAA con `// Arrange`, `// Act`, `// Assert`.
- `mediaEnDesuso.ts` no importa `serverEnv` ni `cloudflare:*`: los prefijos
  llegan por parámetro (Regla 1.1).
