import { requireServerEnv } from '@shared/lib/env/serverEnv';

// Configuración de Cloudflare R2, resuelta desde el entorno UNA sola vez.
//
// La resolución es perezosa (dentro de `getR2Config()`, no en el cuerpo del
// módulo) a propósito: importar este archivo no debe reventar cuando faltan las
// credenciales. Un `throw` a nivel de módulo tumba el build y cualquier página
// que lo alcance por la cadena de imports, aunque esa página no toque R2.

const R2_ENV_VARS = [
  'BARZOL_R2_ACCOUNT_ID',
  'BARZOL_R2_ACCESS_KEY',
  'BARZOL_R2_SECRET_KEY',
  'BARZOL_R2_BUCKET_NAME',
  'BARZOL_R2_PUBLIC_URL',
] as const;

export interface R2Config {
  /** ID de cuenta de Cloudflare — también forma el endpoint S3. */
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Endpoint S3-compatible de R2. */
  endpoint: string;
  /** Base pública de lectura (dominio propio o `*.r2.dev`), sin barra final. */
  publicBaseUrl: string;
}

let cache: R2Config | null = null;

export function getR2Config(): R2Config {
  if (cache) return cache;

  const env = requireServerEnv(R2_ENV_VARS);

  cache = {
    accountId: env.BARZOL_R2_ACCOUNT_ID,
    accessKeyId: env.BARZOL_R2_ACCESS_KEY,
    secretAccessKey: env.BARZOL_R2_SECRET_KEY,
    bucket: env.BARZOL_R2_BUCKET_NAME,
    endpoint: `https://${env.BARZOL_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    publicBaseUrl: env.BARZOL_R2_PUBLIC_URL.replace(/\/+$/, ''),
  };

  return cache;
}
