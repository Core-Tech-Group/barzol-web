# SPEC-903 — Acceso al diagnóstico

**Estado:** BORRADOR — pendiente de aprobación humana
**Capa:** 1 (lógica pura) + 3 (endpoints) · **Fecha:** 2026-08-22
**Unidad destino:** `src/shared/lib/diagnostico/acceso.ts`, `src/shared/lib/diagnostico/estadoBasico.ts`, `src/shared/lib/diagnostico/probarSupabase.ts`, `src/pages/api/salud.ts`
**Cierra:** `BZ-72`, y hereda `BZ-37` del tablero hermano

---

## Contexto

`GET /api/diagnostico` es la herramienta que cerró el hilo de despliegue: informa
qué variables recibe el worker, qué bindings tiene, si Supabase responde y qué
commit corre. Es pública.

El endpoint ya está bien construido —**nunca devuelve el valor de una variable**,
solo si está presente, cuánto mide y qué la invalida, y de los errores devuelve
el nombre, no el mensaje—. Lo que sí expone es **metainformación de
configuración**: los nombres de todas las variables que recibe el worker
(incluidos los secretos), qué bindings existen y el SHA exacto del commit
desplegado. Para alguien que busque por dónde entrar, eso es un mapa.

## El problema de cerrarlo sin más

Protegerlo del todo, hoy, deja al proyecto **sin su primera parada de
diagnóstico** — el paso 1 del runbook— hasta que alguien configure un secreto en
Cloudflare. Si el sitio se cae en esa ventana, se pierde justo la herramienta que
existe para esos momentos.

De ahí que esta SPEC defina **tres niveles**, no dos: la seguridad sube de
inmediato sin que haya un instante en que no se pueda diagnosticar nada.

## Fuera de alcance

- Autenticación de administrador para el diagnóstico (bastaría, pero obligaría a
  tener sesión desde una terminal, que es donde se diagnostica).
- Rotación del token.
- Limitación de frecuencia.

---

## Requisitos (EARS)

### [REQ-941] — Ubicuo
El sistema DEBE exponer `GET /api/salud`, público y sin autenticación, que
devuelva **únicamente** `ok`, el commit desplegado y el momento de la respuesta.

> Es lo que permite cerrar el diagnóstico sin quedarse ciego. `ok` y `commit` son
> lo que necesita el humo (`SPEC-901` REQ-956), y ninguno de los dos describe la
> configuración.

### [REQ-942] — Dirigido por estado · sin token configurado
MIENTRAS la variable `BARZOL_DIAGNOSTICO_TOKEN` **no** esté configurada en el
entorno del worker, `GET /api/diagnostico` DEBE responder `200` con el mismo
cuerpo reducido de `/api/salud`, más una pista que indique cómo configurar el
token para recuperar el detalle.

> Éste es el escalón que hace la transición segura. En cuanto se despliega, la
> fuga desaparece; nadie se queda sin liveness; y el propio endpoint explica qué
> falta para volver al detalle completo.

### [REQ-943] — Dirigido por estado · token configurado y correcto
MIENTRAS `BARZOL_DIAGNOSTICO_TOKEN` esté configurada y la petición presente ese
mismo valor en la cabecera `x-diagnostico-token`, el sistema DEBE responder `200`
con el diagnóstico completo.

### [REQ-944] — No deseado · token configurado y ausente o incorrecto
SI `BARZOL_DIAGNOSTICO_TOKEN` está configurada y la petición no presenta la
cabecera, o presenta un valor distinto, ENTONCES el sistema DEBE responder `404`
con un cuerpo vacío.

> `404` y no `403`: un `403` confirma que el endpoint existe. El `404` es
> indistinguible de una ruta que nunca existió.

### [REQ-945] — Ubicuo · comparación en tiempo constante
El sistema DEBE comparar el token con un algoritmo cuyo tiempo de ejecución no
dependa de cuántos caracteres coinciden.

> Una comparación con `===` sobre cadenas corta en la primera diferencia. Con
> suficientes intentos, el tiempo de respuesta filtra el token carácter a
> carácter. Es barato de evitar y caro de descubrir después.

### [REQ-946] — No deseado
SI se produce cualquier error al resolver el nivel de acceso, ENTONCES el sistema
DEBE degradar al nivel **más restrictivo** disponible, nunca al más permisivo.

### [REQ-947] — Ubicuo
El sistema NO DEBE incluir el token, ni ninguna parte de él, en ninguna respuesta,
pista, log ni mensaje de error.

---

## Contrato

```typescript
export type NivelAcceso = 'completo' | 'reducido' | 'oculto';

export interface EntornoAcceso {
  /** Valor configurado, o undefined si no lo está. */
  tokenConfigurado: string | undefined;
  /** Valor presentado en la cabecera `x-diagnostico-token`. */
  tokenPresentado: string | null;
}

export function resolverNivelAcceso(entorno: EntornoAcceso): NivelAcceso;
export function comparacionSegura(a: string, b: string): boolean;
```

| `tokenConfigurado` | `tokenPresentado` | Nivel | Respuesta |
| :--- | :--- | :--- | :--- |
| ausente | cualquiera | `reducido` | 200, cuerpo de salud + pista |
| presente | coincide | `completo` | 200, diagnóstico entero |
| presente | ausente o distinto | `oculto` | 404, cuerpo vacío |


### Cuerpo reducido compartido

Lo construye un único módulo, `estadoBasico.ts`, que usan los dos endpoints. Si
cada uno armara el suyo, INV-4 duraría hasta el primer cambio.

```typescript
// src/shared/lib/diagnostico/estadoBasico.ts
export interface EstadoBasico {
  ok: boolean;
  commit: string;
  momento: string;
}

export function construirEstadoBasico(ok: boolean, ahora?: () => Date): EstadoBasico;
```

`ahora` va inyectable por la Regla 6.1: sin eso el módulo dejaría de ser lógica
pura y el gate de determinismo lo reportaría, con razón.


### Sonda de Supabase compartida

`probarSupabase.ts` vivía como función privada dentro de
`src/pages/api/diagnostico.ts`. Se extrajo al añadir `/api/salud`: los dos
endpoints necesitan la misma respuesta a la misma pregunta —"¿la base
contesta?"— y dos copias se habrían separado a la primera.

```typescript
// src/shared/lib/diagnostico/probarSupabase.ts
export interface EstadoSupabase {
  ok: boolean;
  /** Nombre del error, nunca su mensaje. */
  motivo: string | null;
  /** Código de PostgrestError cuando la consulta llegó y fue rechazada. */
  codigo: string | null;
}

export function probarSupabase(): Promise<EstadoSupabase>;
```

Es un **adaptador**, no lógica pura: hace I/O contra Supabase. Por eso devuelve
un estado descriptivo en vez de lanzar, y por eso no tiene tests de Capa 1 — se
ejercita desde los tests de Capa 3 de ambos endpoints.

## Invariantes verificables

- **INV-1:** `resolverNivelAcceso` es una función pura: sin I/O, sin reloj, sin
  entorno global. Recibe lo que necesita.
- **INV-2:** No existe ninguna entrada que produzca `completo` sin que
  `tokenConfigurado` esté presente y coincida.
- **INV-3:** `comparacionSegura('', '')` es `true`; `comparacionSegura(x, y)` con
  longitudes distintas es `false` sin comparar contenido.
- **INV-4:** El cuerpo reducido es un subconjunto estricto del completo: los
  campos que comparten tienen el mismo nombre y el mismo significado.

## Riesgo de regresión

**El humo (`SPEC-901`) depende hoy de `/api/diagnostico`.** Sus sondas
`TEST-S04`, `TEST-S05` y `TEST-S06` leen `ok`, `clavesRecibidas`, `bindings` y el
commit. Con REQ-942, `clavesRecibidas` y `bindings` dejan de estar disponibles sin
token.

`SPEC-901` se enmienda en consecuencia: `TEST-S06` (commit, la sonda de mayor
valor) pasa a leer `/api/salud` y sigue funcionando siempre; `TEST-S04` y
`TEST-S05` pasan a informar **AVISO** cuando no hay token, en vez de fallar.

El runbook de diagnóstico también cambia: su paso 1 sigue siendo
`/api/diagnostico`, pero ahora con la cabecera.
