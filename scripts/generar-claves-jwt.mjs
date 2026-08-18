#!/usr/bin/env node
// Genera el trío de claves que ata la base local: el secreto JWT y las dos
// claves firmadas con él.
//
// En Supabase gestionado estas tres cosas se copian del panel. Acá no hay panel,
// así que se generan una vez y quedan en `docker/.env` (ignorado por git).
//
//   secreto        Lo comparten GoTrue (firma los tokens de sesión del admin) y
//                  PostgREST (los verifica). Si los dos no tienen el MISMO
//                  valor, el login "funciona" y después toda escritura devuelve
//                  401 — un modo de fallo caro de diagnosticar.
//   anon           Va en BARZOL_SUPABASE_ANON_KEY. Es un JWT con `role: anon`,
//                  el que usa el sitio para leer el catálogo. No es un secreto
//                  real: RLS es lo que protege los datos, no esta clave.
//   service_role   Salta RLS. La usa SÓLO el alta del admin durante el
//                  despliegue; la aplicación nunca la recibe.
//
// Uso:
//   node scripts/generar-claves-jwt.mjs            # secreto nuevo al azar
//   node scripts/generar-claves-jwt.mjs <secreto>  # claves para uno existente
//
// Imprime líneas `CLAVE=valor` listas para volcar en un archivo de entorno.

import { createHmac, randomBytes } from 'node:crypto';

/** Diez años: es una demo local, no hay rotación que administrar. */
const VIGENCIA_SEGUNDOS = 60 * 60 * 24 * 365 * 10;

function base64url(entrada) {
  return Buffer.from(entrada)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Firma un JWT HS256 a mano. Son ~15 líneas y evitan sumar una dependencia al
 * proyecto para algo que se ejecuta una sola vez, en el anfitrión, fuera del
 * bundle del sitio.
 */
function firmarJwt(payload, secreto) {
  const cabecera = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const cuerpo = base64url(JSON.stringify(payload));
  const firma = createHmac('sha256', secreto)
    .update(`${cabecera}.${cuerpo}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${cabecera}.${cuerpo}.${firma}`;
}

function claveDeRol(rol, secreto, emitidoEn) {
  return firmarJwt(
    {
      // `iss: supabase` no es decorativo: GoTrue rechaza los tokens cuyo emisor
      // no reconoce.
      iss: 'supabase',
      role: rol,
      iat: emitidoEn,
      exp: emitidoEn + VIGENCIA_SEGUNDOS,
    },
    secreto
  );
}

// El secreto debe tener al menos 32 caracteres: por debajo de eso HS256 pierde
// margen y GoTrue lo rechaza en algunas versiones.
const secreto = process.argv[2] ?? randomBytes(32).toString('hex');
if (secreto.length < 32) {
  console.error('El secreto JWT debe tener al menos 32 caracteres.');
  process.exit(1);
}

const emitidoEn = Math.floor(Date.now() / 1000);

console.log(`BARZOL_JWT_SECRET=${secreto}`);
console.log(`BARZOL_SUPABASE_ANON_KEY=${claveDeRol('anon', secreto, emitidoEn)}`);
console.log(`BARZOL_SERVICE_ROLE_KEY=${claveDeRol('service_role', secreto, emitidoEn)}`);
