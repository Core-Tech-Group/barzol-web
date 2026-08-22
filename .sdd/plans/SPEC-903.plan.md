# PLAN DE PRUEBAS — SPEC-903 · Acceso al diagnóstico

**Archivos destino:** `tests/unit/diagnostico/acceso.test.ts` (Capa 1) y
`tests/workers/diagnostico.test.ts` (Capa 3)
**Fuente:** [`../specs/SPEC-903-acceso-diagnostico.md`](../specs/SPEC-903-acceso-diagnostico.md)

> La decisión de acceso se prueba como lógica pura y los tres niveles se
> verifican otra vez sobre el endpoint real dentro de workerd. No es duplicar:
> la primera comprueba la regla, la segunda comprueba que el endpoint la usa.
> Un endpoint puede tener la regla perfecta y no llamarla.

---

## Matriz — `resolverNivelAcceso` (Capa 1)

| ID | Escenario | `tokenConfigurado` | `tokenPresentado` | Nivel | REQ |
| :-- | :--- | :--- | :--- | :--- | :--- |
| TEST-401 | Sin configurar, sin presentar | `undefined` | `null` | `reducido` | REQ-942 |
| TEST-402 | Sin configurar, presentando algo | `undefined` | `'loquesea'` | `reducido` | REQ-942, INV-2 |
| TEST-403 | Configurado y coincide | `'s3cr3t0'` | `'s3cr3t0'` | `completo` | REQ-943 |
| TEST-404 | Configurado, cabecera ausente | `'s3cr3t0'` | `null` | `oculto` | REQ-944 |
| TEST-405 | Configurado, valor distinto | `'s3cr3t0'` | `'otro'` | `oculto` | REQ-944 |
| TEST-406 | Configurado, prefijo correcto | `'s3cr3t0'` | `'s3c'` | `oculto` | REQ-944, REQ-945 |
| TEST-407 | Configurado, con espacios alrededor | `'s3cr3t0'` | `' s3cr3t0 '` | `oculto` | REQ-944 |
| TEST-408 | Configurado vacío cuenta como no configurado | `''` | `null` | `reducido` | REQ-942, REQ-946 |
| TEST-409 | Configurado con espacios cuenta como no configurado | `'   '` | `null` | `reducido` | REQ-946 |

> TEST-408 y TEST-409 existen porque un secreto mal cargado suele quedar vacío,
> no ausente. Tratarlo como "configurado" dejaría el endpoint en `oculto`
> permanentemente: nadie podría diagnosticar y nadie sabría por qué. REQ-946 pide
> degradar a lo más restrictivo **disponible**, y con un token inservible el nivel
> útil más restrictivo es `reducido`, no `oculto`.

## Matriz — `comparacionSegura` (Capa 1)

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-410 | Iguales | `('abc','abc')` | `true` | REQ-945 |
| TEST-411 | Distintas, misma longitud | `('abc','abd')` | `false` | REQ-945 |
| TEST-412 | Longitudes distintas | `('abc','abcd')` | `false` | INV-3 |
| TEST-413 | Ambas vacías | `('','')` | `true` | INV-3 |
| TEST-414 | Recorre la cadena entera | `('aaaa','baaa')` vs `('aaaa','aaab')` | ambas `false` | REQ-945 |

> TEST-414 no mide tiempos —eso sería inestable en CI— sino que ambas posiciones
> se comportan igual. Medir nanosegundos en un runner compartido produce tests
> que fallan al azar, y un test que falla al azar se acaba borrando.

## Matriz — endpoints en workerd (Capa 3)

| ID | Escenario | Estado | Cuerpo | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-W20 | `GET /api/salud` sin nada | 200 | `ok`, `commit`, `momento` y nada más | REQ-941 |
| TEST-W21 | `/api/salud` no describe la configuración | 200 | sin `clavesRecibidas`, `bindings` ni `variables` | REQ-941 |
| TEST-W22 | `/api/diagnostico` sin token configurado | 200 | cuerpo reducido + pista sobre el token | REQ-942 |
| TEST-W23 | `/api/diagnostico` con token, cabecera correcta | 200 | incluye `clavesRecibidas` y `bindings` | REQ-943 |
| TEST-W24 | `/api/diagnostico` con token, sin cabecera | 404 | vacío | REQ-944 |
| TEST-W25 | `/api/diagnostico` con token, cabecera incorrecta | 404 | vacío | REQ-944 |
| TEST-W26 | El token nunca aparece en la respuesta | 200 y 404 | ninguna respuesta lo contiene | REQ-947 |
| TEST-W27 | El cuerpo reducido es subconjunto del completo | 200 | `commit` idéntico en ambos niveles | INV-4 |

---

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-941 | TEST-W20, W21 | ⏳ |
| REQ-942 | TEST-401, 402, 408, 409, W22 | ⏳ |
| REQ-943 | TEST-403, W23 | ⏳ |
| REQ-944 | TEST-404..407, W24, W25 | ⏳ |
| REQ-945 | TEST-406, 410, 411, 414 | ⏳ |
| REQ-946 | TEST-408, 409 | ⏳ |
| REQ-947 | TEST-W26 | ⏳ |

## Reglas para el agente

- El token de prueba nunca se escribe en un valor por defecto ni en un ejemplo.
- Los tests de Capa 3 declaran el token vía bindings de Miniflare, no leyendo
  `.env`: el entorno de prueba no debe depender de un archivo local.
- Prohibido medir tiempos para verificar REQ-945 (ver nota de TEST-414).
