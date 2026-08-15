{
  "level": "error",
  "nivel": "error",
  "contexto": "middleware",
  "ruta": "/",
  "metodo": "GET",
  "error": "MissingEnvError",
  "mensaje": "Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.",
  "stack": "MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.\n    at requireServerEnv (chunks/serverEnv_BCEz3PHr.mjs:93:34)\n    at getSupabase (chunks/client_D0-cckc9.mjs:9:14)\n    at getHomeItems (chunks/homeService_DrMjFYGD.mjs:39:32)\n    at chunks/index_CKOVv1w5.mjs:23:33\n    at AstroComponentInstance.HomeView [as factory] (chunks/compiler_DcMSGxau.mjs:18:10)\n    at AstroComponentInstance.init (chunks/server_Dv7iLfkM.mjs:1706:27)\n    at collectPropagatedHeadParts (chunks/server_Dv7iLfkM.mjs:550:40)\n    at async bufferPropagatedHead (chunks/server_Dv7iLfkM.mjs:580:20)\n    at async bufferHeadContent (chunks/server_Dv7iLfkM.mjs:2095:2)\n    at async renderStreamToStream (chunks/server_Dv7iLfkM.mjs:1955:14)",
  "$workers": {
    "truncated": false,
    "scriptName": "barzol-web",
    "scriptVersion": {
      "id": "571e7959-c1b0-46fb-b864-fa65e781dd22"
    },
    "eventType": "fetch",
    "executionModel": "stateless",
    "requestId": "93d72d3626a2de0de57e07188709cf2f",
    "event": {
      "request": {
        "method": "GET",
        "url": "https://barzol-web.willymichael-cardenas.workers.dev/",
        "path": "/"
      }
    },
    "traceId": "46bcb31746eec2d8a75ae49c328df626",
    "spanId": "76015ed37ace62cc"
  },
  "$metadata": {
    "id": "01M01YHC2P0000000000000001",
    "requestId": "93d72d3626a2de0de57e07188709cf2f",
    "rayId": "a2b5d2535ab91eab",
    "traceId": "46bcb31746eec2d8a75ae49c328df626",
    "spanId": "76015ed37ace62cc",
    "trigger": "GET /",
    "service": "barzol-web",
    "level": "error",
    "error": "MissingEnvError",
    "account": "156f0abd69402bcc35274807f251d1d5",
    "type": "cf-worker",
    "fingerprint": "1582b5c80efd454c3b59580965a8a010",
    "origin": "fetch"
  }
}