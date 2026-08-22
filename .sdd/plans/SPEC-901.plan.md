# PLAN DE PRUEBAS — SPEC-901 · Humo post-despliegue

**Archivo destino:** `scripts/smoke.mjs` · tests en `tests/unit/smoke/`
**Fuente:** [`../specs/SPEC-901-smoke-produccion.md`](../specs/SPEC-901-smoke-produccion.md)

---

## Matriz de sondas — contra producción

Ejecutadas por `node scripts/smoke.mjs`. `TEST-S01` a `TEST-S07` son las sondas en
sí; no son tests unitarios, son las comprobaciones que el script realiza.

| ID | Sonda | Petición | Aserción | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-S01 | Portada viva | `GET /` | `200` y `content-type` contiene `text/html` | REQ-952 |
| TEST-S02 | Catálogo con datos | `GET /catalogo/<slug>` | `200` y el cuerpo contiene ≥1 producto | REQ-953 |
| TEST-S03 | 404 propio | `GET /ruta-que-no-existe-<aleatorio>` | `404` y el cuerpo contiene el texto de la página propia en español | REQ-954 |
| TEST-S04 | Diagnóstico sano | `GET /api/diagnostico` + cabecera | `ok`, `supabase.ok`, `bindings.MEDIA`, `bindings.ASSETS` todos `true` | REQ-955 |
| TEST-S05 | Claves presentes | ídem | `clavesRecibidas` ⊇ las tres esperadas | REQ-955 |
| TEST-S06 | Commit correcto | ídem | `commit` informado === SHA desplegado | REQ-956 |
| TEST-S07 | Imagen desde R2 | `HEAD <R2_PUBLIC_URL>/<key conocida>` | `200` | REQ-957 |

> El sufijo aleatorio de TEST-S03 no es paranoia: una ruta fija podría acabar
> existiendo, y el día que exista el test se pondría verde por el motivo equivocado.

## Matriz — lógica interna del script

El script es código propio y su lógica de decisión sí se prueba en Vitest, con
respuestas fabricadas. **Esto no viola la Regla 5.2:** no se mockea una librería, se
le pasa al evaluador un objeto de respuesta ya construido.

| ID | Escenario | Entrada | Esperado | REQ |
| :-- | :--- | :--- | :--- | :--- |
| TEST-S10 | Todas las sondas pasan | 7 resultados `PASA` | código de salida `0` | REQ-951 |
| TEST-S11 | Una falla | 6 `PASA`, 1 `FALLA` | código de salida `1` | REQ-951 |
| TEST-S12 | Se ejecutan todas pese al fallo | la 2ª falla | el informe contiene 7 líneas | REQ-959 |
| TEST-S13 | Timeout | respuesta que tarda 11 s | `FALLA` con detalle de tiempo agotado, sin reintento | REQ-958 |
| TEST-S14 | Commit distinto | desplegado `abc123`, informado `def456` | `FALLA` mostrando ambos | REQ-956 |
| TEST-S15 | Commit ausente en el diagnóstico | campo `commit` es `null` | `FALLA`, no se omite la sonda | REQ-956 |
| TEST-S16 | El token no se filtra | token `secreto123` en argumentos | ninguna línea de salida lo contiene | INV-3 |
| TEST-S17 | Falta una clave | `clavesRecibidas` sin la anon key | `FALLA` nombrando la clave ausente | REQ-955 |
| TEST-S18 | Invocación sin `--url` | argumentos incompletos | código de salida `2`, no `1` | contrato |
| TEST-S19 | Solo métodos de lectura | traza de las 7 sondas | únicamente `GET` y `HEAD` | REQ-961 |
| TEST-S20 | Sin colores en CI | `CI=1` | la salida no contiene `\x1b[` | contrato |

> **TEST-S15 merece atención.** El modo de fallo natural de una comprobación de
> commit es "si no viene el campo, la salto". Eso hace que la sonda de mayor valor
> —la que detecta despliegues obsoletos— se desactive sola justo cuando el bundle
> viejo no tenía el campo. Ausente debe ser fallo.
>
> **TEST-S19** es la red de seguridad de INV-1. Un smoke test que escribe en R2 o en
> Supabase de producción es un generador de basura que nadie autorizó, y el error
> se comete en la tercera iteración del script, no en la primera.

---

## Cobertura de requisitos

| REQ | Tests | Cubierto |
| :--- | :--- | :--- |
| REQ-951 | TEST-S10, S11 | ⏳ |
| REQ-952..954 | TEST-S01..S03 | ⏳ |
| REQ-955 | TEST-S04, S05, S17 | ⏳ |
| REQ-956 | TEST-S06, S14, S15 | ⏳ |
| REQ-957 | TEST-S07 | ⏳ |
| REQ-958 | TEST-S13 | ⏳ |
| REQ-959 | TEST-S12 | ⏳ |
| REQ-960 | inspección: sin `import` de terceros | ⏳ |
| REQ-961 | TEST-S19 | ⏳ |

## Reglas para el agente

- El script se escribe **antes** que el workflow de CI. Debe poder ejecutarse a mano
  desde una terminal, hoy, contra la URL de producción — así es como se descubre que
  una sonda está mal escrita.
- Prohibido incluir el token en un valor por defecto, en un ejemplo del `--help` o
  en un comentario.
- La `key` conocida de TEST-S07 se toma de un producto ya publicado y se anota en el
  propio script con un comentario que diga de dónde salió. Si ese producto se borra,
  el test empieza a fallar por el motivo equivocado y hay que poder rastrearlo.
