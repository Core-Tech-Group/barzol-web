# SPEC-901 — Verificación de humo post-despliegue

**Estado:** BORRADOR — pendiente de aprobación humana
**Capa:** Plataforma / pruebas del sistema · **Fecha:** 2026-08-21
**Unidad destino:** `scripts/smoke.mjs` (**no existe todavía**)
**Objetivo:** `https://barzol-web.willymichael-cardenas.workers.dev/`
**Cierra:** `BZ-24` (verificación post-deploy), abierta desde el 2026-08-08

---

## Contexto

Éste es el gate que le faltaba al proyecto durante las ocho revisiones del kanban
de despliegue. La secuencia se repitió cinco veces: se desplegaba, el build salía
verde, y **el sitio devolvía 500 en producción** — porque el bundle compilaba pero
el worker no recibía la anon key.

Ningún test unitario detecta eso. Es un fallo de *entrega*, no de código: el
artefacto es correcto y el entorno donde corre, no. La única forma de verlo es
**preguntarle al despliegue real si está vivo**.

`/api/diagnostico` ya devuelve exactamente la información necesaria. Lo que falta es
que alguien la lea automáticamente después de cada despliegue en vez de que un
humano se acuerde de mirarla.

## Dependencia bloqueante

`/api/diagnostico` es **público** hoy. Usarlo como sonda tal cual amplifica la fuga
de información que `BZ-37` ya identificó: expone qué variables recibe el worker y
qué bindings tiene. `BZ-72` debe resolverse **antes** que esta SPEC:

- **Opción 1 (recomendada):** el endpoint exige una cabecera con un token
  compartido; sin ella responde 404, no 403 — un 403 confirma que el endpoint existe.
- **Opción 2:** se separa en `/api/salud` público y minimalista (`{ ok: true }`) y
  `/api/diagnostico` protegido con el detalle completo.

Esta SPEC asume la **Opción 1**. Si se elige la 2, REQ-905 cambia.

## Fuera de alcance

- Comprobar el contenido visual (eso es E2E, `BZ-74`).
- Medir rendimiento o Core Web Vitals.
- Probar el flujo de admin autenticado.
- Escribir en R2 o Supabase desde producción. **La sonda es de solo lectura**, sin
  excepciones: un smoke test que escribe en el bucket real es un generador de basura
  con permiso de nadie.

---

## Requisitos (EARS)

### [REQ-951] — Dirigido por evento
CUANDO se complete un despliegue a producción, el sistema DEBE ejecutar la
verificación de humo contra la URL pública y DEBE devolver código de salida `0`
solo si **todas** las comprobaciones REQ-952..957 pasan.

### [REQ-952] — Ubicuo · portada
El sistema DEBE solicitar `GET /` y DEBE exigir estado `200` y un
`content-type` que contenga `text/html`.

### [REQ-953] — Ubicuo · catálogo con datos reales
El sistema DEBE solicitar una ruta de catálogo y DEBE exigir estado `200` y que el
cuerpo contenga al menos un producto renderizado.

> Es la comprobación que separa "el worker responde" de "el worker **lee la base de
> datos**". Una portada estática puede salir 200 con Supabase caído.

### [REQ-954] — Ubicuo · ruta inexistente
El sistema DEBE solicitar una ruta que no existe y DEBE exigir estado `404` servido
por la página propia en español, **no** por el 404 por defecto de Astro.

> Verificado como comportamiento correcto en `BZ-40`. Si vuelve el 404 genérico, el
> despliegue está sirviendo un bundle viejo.

### [REQ-955] — Ubicuo · diagnóstico
El sistema DEBE solicitar `GET /api/diagnostico` con la cabecera de autenticación
y DEBE exigir que la respuesta cumpla:

| Campo | Condición |
| :--- | :--- |
| `ok` | `=== true` |
| `supabase.ok` | `=== true` |
| `bindings.MEDIA` | `=== true` |
| `bindings.ASSETS` | `=== true` |
| `clavesRecibidas` | contiene `BARZOL_SUPABASE_URL`, `BARZOL_SUPABASE_ANON_KEY` y `BARZOL_R2_PUBLIC_URL` |

### [REQ-956] — Dirigido por evento · **el requisito que cierra `BZ-52`**
CUANDO se conozca el SHA del commit que se acaba de desplegar, el sistema DEBE
compararlo con el commit que informa `/api/diagnostico` y DEBE fallar si difieren.

> `BZ-38` describe dos commits que tardaron un día en publicarse sin que nadie lo
> notara. Este requisito convierte ese fallo silencioso en un check rojo. Es,
> probablemente, la comprobación de mayor valor de toda la SPEC.

### [REQ-957] — Ubicuo · imágenes desde R2
El sistema DEBE solicitar con `HEAD` una imagen de producto conocida servida desde
el dominio público de R2 y DEBE exigir estado `200`.

### [REQ-958] — No deseado
SI cualquier petición supera **10 segundos**, ENTONCES el sistema DEBE considerarla
fallida y DEBE informar el tiempo agotado, no reintentar indefinidamente.

### [REQ-959] — No deseado
SI una comprobación falla, ENTONCES el sistema DEBE ejecutar igualmente las
restantes y DEBE reportar **todas** al final.

> Detenerse en la primera esconde información. En el diagnóstico de `BZ-49`, saber
> que el binding de R2 estaba bien *mientras* Supabase fallaba fue lo que descartó
> media docena de hipótesis de golpe.

### [REQ-960] — Ubicuo
El sistema DEBE ejecutarse sin dependencias externas: `fetch` nativo y `node:*`
únicamente. Sin `axios`, sin frameworks de test.

> La sonda tiene que poder correr desde una máquina limpia, o desde un teléfono por
> SSH un sábado. Toda dependencia que añada es una razón más para que no funcione
> justo cuando hace falta.

### [REQ-961] — No deseado
SI la ejecución es contra producción, ENTONCES el sistema NO DEBE realizar ninguna
petición con método distinto de `GET` o `HEAD`.

---

## Contrato

```typescript
interface ResultadoSonda {
  id: string;            // 'TEST-S01'
  descripcion: string;
  estado: 'PASA' | 'FALLA';
  detalle: string | null;
  duracionMs: number;
}

// node scripts/smoke.mjs --url <base> --commit <sha> [--token <t>]
// exit 0 = todas pasan · exit 1 = alguna falla · exit 2 = error de invocación
```

Salida en texto plano, una línea por sonda, más un resumen. Sin colores ANSI cuando
`process.env.CI` esté definido.

## Invariantes verificables

- **INV-1:** Sin efectos secundarios. Solo `GET` y `HEAD` (REQ-961).
- **INV-2:** Determinista respecto a la salud del despliegue: dos ejecuciones
  seguidas sobre el mismo despliegue sano dan el mismo resultado.
- **INV-3:** El token nunca aparece en la salida, ni siquiera truncado.
- **INV-4:** El script no lee `.env` del repositorio. Toma todo de argumentos o de
  variables de entorno del proceso.
