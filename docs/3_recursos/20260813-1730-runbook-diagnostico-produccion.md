# Runbook — diagnosticar producción

> **Creado:** 2026-08-13 · **Worker:** `barzol-web` · **URL:** https://barzol-web.willymichael-cardenas.workers.dev

Qué hacer cuando el sitio devuelve "Algo salió mal". Está escrito para resolverlo **sin abrir el código**.

## Lo primero que hay que entender

**El log del despliegue no sirve para esto.** Termina en `✨ Success! Build completed.` aunque el sitio esté completamente caído — sólo cuenta que el bundle se compiló y se subió. Las caídas del 2026-08-12 y del 2026-08-13 tuvieron ambas un despliegue verde.

Ese log responde "¿se subió el código?". La pregunta cuando el sitio falla es otra: "¿qué configuración recibe el worker al atender una petición?". Son cosas distintas y se miran en lugares distintos.

## Paso 1 — `GET /api/diagnostico` (10 segundos, sin herramientas)

Abrir en el navegador:

```
https://barzol-web.willymichael-cardenas.workers.dev/api/diagnostico
```

Responde JSON con el estado real del worker desplegado:

```json
{
  "ok": false,
  "variables": {
    "BARZOL_SUPABASE_URL": { "presente": false },
    "BARZOL_SUPABASE_ANON_KEY": { "presente": false },
    "BARZOL_R2_PUBLIC_URL": { "presente": true, "longitud": 52, "problemas": [] }
  },
  "bindings": { "MEDIA": true, "SESSION": true, "IMAGES": true, "ASSETS": true },
  "supabase": { "ok": false, "motivo": "MissingEnvError", "codigo": null },
  "pistas": ["NINGUNA variable llegó al worker. Si estaban cargadas en el panel, ..."]
}
```

**`pistas` es el campo que hay que leer.** Traduce el resto a la acción concreta. Los demás campos están para confirmarla.

Cómo leer lo que informa:

| Campo | Significa |
|---|---|
| `presente: false` | La variable no llegó al worker. No distingue "nunca se cargó" de "el despliegue la borró" — ver Paso 2 |
| `problemas: ["corchetes-de-markdown"]` | El valor se pegó como `[https://...](https://...)`. Es el error que tumbó el sitio el 2026-08-12 |
| `problemas: ["no-es-url-http"]` | El valor no empieza por `https://` |
| `longitud` | Sirve para detectar un valor recortado al copiar. Una anon key ronda los 45 caracteres |
| `supabase.motivo: "MissingEnvError"` | Ni se intentó conectar: falta configuración |
| `supabase.motivo: "consulta-rechazada"` | Supabase respondió y dijo que no. Las variables llegan bien; mirar la clave anon o las policies de RLS. `codigo` trae el código de PostgREST |
| `bindings` en `false` | El binding no llegó. `MEDIA` se declara en `wrangler.jsonc`; los otros tres los inyecta el adaptador de Astro |

**El endpoint nunca devuelve el valor de una variable** — sólo si está, cuánto mide y qué la invalida. Tampoco devuelve mensajes de error, sólo su nombre y código: el mensaje completo va a los logs (Paso 3). Es seguro abrirlo desde cualquier lado y pasar la captura por chat.

Responde `200` siempre, incluso cuando todo está roto. Un 500 acá se confundiría con el 500 que se está diagnosticando; el estado real va en `ok`.

## Paso 2 — la trampa de `wrangler deploy` y las variables del panel

Si el diagnóstico dice que **ninguna** variable llegó pero vos las cargaste en el panel, esto es lo que pasó:

> Por defecto wrangler trata `wrangler.jsonc` como única fuente de verdad, al estilo terraform. Como ahí no hay bloque `vars`, **cada `wrangler deploy` borra las variables cargadas desde el panel.**

Es comportamiento documentado, no un bug — está en la descripción del propio esquema de configuración de wrangler. Y el despliegue de Cloudflare corre `npx wrangler deploy` en cada push, así que el ciclo era: cargar variables → funciona → cualquier push las borra → 500.

Ya está corregido con `"keep_vars": true` en `wrangler.jsonc`. **Si alguna vez vuelve a pasar, lo primero que hay que revisar es que esa línea siga ahí.**

Los **Secrets** no se ven afectados: wrangler nunca los toca. Sólo las *Variables* de texto plano.

## Paso 3 — los logs del worker

Para lo que el diagnóstico no cubre: errores dentro de una página, fallas de red, respuestas raras de Supabase. Cada error que atraviesa el middleware queda registrado como una línea de JSON.

**Desde el panel (sin instalar nada):**

Cloudflare → Workers & Pages → `barzol-web` → pestaña **Observability** → Logs. Ya está habilitada en `wrangler.jsonc`.

**Desde la terminal, en vivo:**

```bash
npx wrangler login          # abre el navegador una vez
npx wrangler tail barzol-web
```

Con el `tail` abierto, recargar la página que falla. Cada error sale así:

```json
{
  "nivel": "error",
  "contexto": "middleware",
  "ruta": "/catalogo/impresoras",
  "metodo": "GET",
  "error": "MissingEnvError",
  "mensaje": "Faltan variables de entorno: ...",
  "stack": "..."
}
```

Buscar por el campo `contexto` para filtrar: `middleware`, `api.diagnostico.supabase`.

**Límite conocido:** con streaming activado la respuesta puede empezar a viajar antes de que el cuerpo de la página termine de renderizarse, y un error lanzado en ese tramo no pasa por el middleware. Por eso el rastreo no depende sólo de los logs — el Paso 1 responde sin necesidad de provocar el error.

## Paso 4 — sondeo directo de rutas

Si hace falta confirmar el alcance de la falla:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://barzol-web.willymichael-cardenas.workers.dev/
curl -s https://barzol-web.willymichael-cardenas.workers.dev/api/productos
```

`/api/productos` hoy devuelve el mensaje de error interno completo. **Es útil para depurar y a la vez es una fuga que hay que cerrar** — está fichada como `BZ-14`. Cuando se cierre, esta vía deja de funcionar y queda `/api/diagnostico`, que fue construido justamente para reemplazarla sin filtrar nada.

## Checklist de humo tras cada cambio de configuración

```
/api/diagnostico   ok: true
/                  200 y muestra productos
/api/productos     JSON con datos
/admin/login       200
```

Recordar: **guardar variables en el panel no redespliega solo.** Hay que volver a desplegar para que el worker las tome.
