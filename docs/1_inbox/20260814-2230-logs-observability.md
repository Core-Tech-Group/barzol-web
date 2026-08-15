03:29:00 [ERROR] MissingEnvError: Faltan variables de entorno: BARZOL_SUPABASE_URL, BARZOL_SUPABASE_ANON_KEY. En local se declaran en `.env` (copiá `.env.example`); en producción, en Cloudflare → Workers & Pages → barzol-web → Settings → Variables and Secrets.
    at requireServerEnv (chunks/serverEnv_BCEz3PHr.mjs:93:34)
    at getSupabase (chunks/client_D0-cckc9.mjs:9:14)
    at getHomeItems (chunks/homeService_DrMjFYGD.mjs:39:32)
    at chunks/index_CKOVv1w5.mjs:23:33
    at AstroComponentInstance.HomeView [as factory] (chunks/compiler_DcMSGxau.mjs:18:10)
    at AstroComponentInstance.init (chunks/server_Dv7iLfkM.mjs:1706:27)
    at collectPropagatedHeadParts (chunks/server_Dv7iLfkM.mjs:550:40)
    at async bufferPropagatedHead (chunks/server_Dv7iLfkM.mjs:580:20)
    at async bufferHeadContent (chunks/server_Dv7iLfkM.mjs:2095:2)
    at async renderStreamToStream (chunks/server_Dv7iLfkM.mjs:1955:14)