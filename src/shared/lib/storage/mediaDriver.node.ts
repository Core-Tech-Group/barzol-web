import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import { readServerEnv } from '@shared/lib/env/serverEnv';
import type { MediaLeida } from './mediaLectura';

// Lectura y escritura física de multimedia en el objetivo `node`: un directorio
// del disco de la Orange Pi, montado como volumen de Docker y entregado por
// `pages/media/[...ruta].ts` bajo la misma ruta pública que tendría el bucket.
//
// Contraparte de `mediaDriver.cloudflare.ts`: misma interfaz, otro destino. El
// nombrado de claves, la sanitización y el armado de la URL pública siguen
// viviendo una sola vez en `mediaKey.ts` / `mediaUrl.ts` y son idénticos en los
// dos objetivos, así que una imagen subida en local tiene exactamente la misma
// forma de URL que una subida a R2.
//
// El `contentType` no se guarda como metadato porque un archivo en disco no
// tiene dónde: al servirlo se resuelve por la extensión (`mediaMime.ts`), que
// `sanitizeFileName` preserva. Por eso la subida debe seguir exigiendo una
// extensión coherente con el tipo declarado — cosa que ya hace `mediaSchema.ts`.

/** Directorio raíz del multimedia dentro del contenedor. */
const DIRECTORIO_POR_DEFECTO = '/data/media';

function directorioBase(): string {
  // No termina en `_URL`, así que `readServerEnv` no le aplica la validación de
  // URL absoluta — acá se espera una ruta de sistema de archivos.
  return resolve(readServerEnv('BARZOL_MEDIA_DIR') ?? DIRECTORIO_POR_DEFECTO);
}

/**
 * Verifica que la clave no se escape del directorio base.
 *
 * `buildMediaKey` ya sanitiza el nombre que llega del panel admin, así que esto
 * es defensa en profundidad: la ruta de escritura se deriva de entrada hostil y
 * un `..` que sobreviviera a un cambio futuro en la sanitización escribiría en
 * cualquier parte del disco del contenedor.
 *
 * @throws si la ruta resuelta cae fuera de la base.
 */
function rutaSegura(base: string, key: string): string {
  const destino = resolve(join(base, key));
  const dentro = relative(base, destino);

  if (dentro === '' || dentro.startsWith('..') || dentro.startsWith(sep)) {
    throw new Error(`Clave de multimedia inválida: ${key}`);
  }

  return destino;
}

/**
 * Escribe el objeto bajo `key`, creando los directorios intermedios
 * (`carpeta/AAAA/MM/`) que la clave implique.
 *
 * El cuerpo viaja como stream de punta a punta, igual que hacia R2: nunca se
 * materializa el archivo completo en memoria.
 */
export async function escribirMedia(
  key: string,
  cuerpo: ReadableStream<Uint8Array>,
  _contentType: string
): Promise<void> {
  const destino = rutaSegura(directorioBase(), key);

  await mkdir(dirname(destino), { recursive: true });

  // `Readable.fromWeb` espera el `ReadableStream` de `node:stream/web`, que es
  // estructuralmente el mismo que el global pero con tipos distintos según qué
  // librerías DOM estén cargadas. El puente de tipos se hace acá, una vez.
  const origen = Readable.fromWeb(cuerpo as unknown as NodeWebReadableStream<Uint8Array>);

  await pipeline(origen, createWriteStream(destino));
}

/**
 * Lee un objeto del disco para que la aplicación lo sirva.
 *
 * En este objetivo NO hay un dominio público de bucket que entregue las
 * imágenes: las sirve el propio sitio, bajo `/media/*`. Antes lo hacía un nginx
 * de borde leyendo el mismo volumen; al pasar el proxy a Traefik —que enruta
 * pero no sirve archivos— la responsabilidad volvió acá.
 *
 * Devuelve `null` si el archivo no existe o si la clave apunta fuera del
 * directorio base, para que quien llama responda 404 sin distinguir entre las
 * dos: decir "esa ruta es inválida" en vez de "no existe" le confirma a quien
 * sondea que encontró el mecanismo.
 */
export async function leerMedia(key: string): Promise<MediaLeida | null> {
  let destino: string;
  try {
    destino = rutaSegura(directorioBase(), key);
  } catch {
    return null;
  }

  let info: Awaited<ReturnType<typeof stat>>;
  try {
    info = await stat(destino);
  } catch {
    return null;
  }

  // Un directorio no es un archivo servible, y `createReadStream` sobre uno
  // fallaría más adelante con EISDIR en mitad de la respuesta.
  if (!info.isFile()) return null;

  const nodeStream = createReadStream(destino);

  return {
    cuerpo: Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>,
    tamano: info.size,
  };
}
