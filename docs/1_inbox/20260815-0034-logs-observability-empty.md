{
  "level": "error",
  "nivel": "error",
  "contexto": "middleware",
  "ruta": "/",
  "metodo": "GET",
  "error": "MissingEnvError",
  "mensaje": "Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.",
  "stack": "MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.\n    at requireServerEnv (chunks/serverEnv_J5PAK9bR.mjs:109:34)\n    at getSupabase (chunks/client_D1U0vR1T.mjs:9:14)\n    at getHomeItems (chunks/homeService_CowF2ol9.mjs:39:32)\n    at chunks/index_DOxvsfE5.mjs:23:33\n    at AstroComponentInstance.HomeView [as factory] (chunks/compiler_DcMSGxau.mjs:18:10)\n    at AstroComponentInstance.init (chunks/server_Dv7iLfkM.mjs:1706:27)\n    at collectPropagatedHeadParts (chunks/server_Dv7iLfkM.mjs:550:40)\n    at async bufferPropagatedHead (chunks/server_Dv7iLfkM.mjs:580:20)\n    at async bufferHeadContent (chunks/server_Dv7iLfkM.mjs:2095:2)\n    at async renderStreamToStream (chunks/server_Dv7iLfkM.mjs:1955:14)",
  "$workers": {
    "truncated": false,
    "scriptName": "barzol-web",
    "scriptVersion": {
      "id": "e366fd7e-e101-4ed9-b63e-b0205eee0e8a"
    },
    "eventType": "fetch",
    "executionModel": "stateless",
    "requestId": "64e5050f49714e9be199158c20038883",
    "event": {
      "request": {
        "method": "GET",
        "url": "https://barzol-web.willymichael-cardenas.workers.dev/",
        "path": "/"
      }
    },
    "traceId": "0eced274fcb368e0b250747de465b64b",
    "spanId": "4f837bbe98ecf741"
  },
  "$metadata": {
    "id": "01M02HMMM40000000000000001",
    "requestId": "64e5050f49714e9be199158c20038883",
    "rayId": "a2b7bb56cabc892e",
    "traceId": "0eced274fcb368e0b250747de465b64b",
    "spanId": "4f837bbe98ecf741",
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