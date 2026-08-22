import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { POST } from '../../src/pages/api/media/index';

/**
 * Capa 3 · `POST /api/media` — la ruta de escritura en R2, de punta a punta.
 *
 * Corre dentro de workerd con el bucket REAL que levanta Miniflare, así que
 * ejercita `guardarMedia` → `getMediaBucket()` → `env.MEDIA.put()` sin un solo
 * doble (Constitución 5.1). Verifica exactamente lo que hace un archivo subido
 * desde el panel, pero contra un bucket efímero: **producción no se toca**, y
 * por eso este test puede correr en cada commit.
 *
 * `BZ-25` del tablero hermano —probar la subida contra el bucket real— sigue
 * siendo otra cosa y sigue abierta: esto prueba el código, no la cuenta.
 */

const PNG_MINIMO: Uint8Array<ArrayBuffer> = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface Opciones {
  carpeta?: string;
  nombre?: string;
  tipo?: string;
  cuerpo?: Uint8Array<ArrayBuffer>;
}

interface MediaGuardada {
  key: string;
  publicUrl: string;
  contentType: string;
  size: number;
}

function peticion({
  carpeta = 'productos',
  nombre = 'foto de prueba.png',
  tipo = 'image/png',
  cuerpo = PNG_MINIMO,
}: Opciones = {}) {
  const url = new URL('https://barzol.test/api/media');
  url.searchParams.set('carpeta', carpeta);
  url.searchParams.set('nombre', nombre);

  const request = new Request(url, {
    method: 'POST',
    headers: { 'content-type': tipo, 'content-length': String(cuerpo.byteLength) },
    // Blob y no el Uint8Array pelado: en los tipos de workerd, BodyInit no
    // acepta Uint8Array<ArrayBufferLike> directamente.
    body: new Blob([cuerpo]),
  });

  // El handler solo usa `request` y `url`; el resto del contexto de Astro no
  // interviene en esta ruta.
  return POST({ request, url } as never);
}

/**
 * Sube y devuelve el recurso ya desenvuelto del sobre `ApiResponse`.
 *
 * Los endpoints de este repo no devuelven el recurso pelado: lo envuelven en
 * `{ success, data, message }` (ver `shared/api/apiResponse.ts`). El primer
 * intento de estos tests asumió la forma cruda y falló — queda escrito acá para
 * que el contrato del sobre exista en algún sitio verificable.
 */
async function subir(opciones?: Opciones) {
  const respuesta = await peticion(opciones);
  const sobre = (await respuesta.json()) as {
    success: boolean;
    data: MediaGuardada | null;
    message: string | null;
  };

  return { status: respuesta.status, sobre, media: sobre.data };
}

describe('SPEC-002 · POST /api/media dentro de workerd', () => {
  it('[TEST-W10] guarda el archivo en R2 y devuelve dónde quedó (REQ-201, REQ-207)', async () => {
    // Act
    const { status, sobre, media } = await subir();

    // Assert — la respuesta
    expect(status).toBe(201);
    expect(sobre.success).toBe(true);
    expect(media!.key).toMatch(/^productos\/\d{4}\/\d{2}\/[0-9a-f-]{36}-foto-de-prueba\.png$/);
    expect(media!.contentType).toBe('image/png');
    expect(media!.size).toBe(PNG_MINIMO.byteLength);
    expect(media!.publicUrl.endsWith(media!.key)).toBe(true);

    // Assert — el objeto existe DE VERDAD en el bucket, con sus bytes.
    // Esto es justo lo que un mock no puede demostrar.
    const guardado = await env.MEDIA.get(media!.key);
    expect(guardado).not.toBeNull();
    expect(new Uint8Array(await guardado!.arrayBuffer())).toEqual(PNG_MINIMO);
  });

  it('[TEST-W11] conserva el content-type como metadato HTTP del objeto', async () => {
    // Sin esto R2 devuelve application/octet-stream y el navegador descarga la
    // imagen en vez de mostrarla.
    const { media } = await subir({ tipo: 'image/webp' });

    const guardado = await env.MEDIA.get(media!.key);

    expect(guardado!.httpMetadata?.contentType).toBe('image/webp');
  });

  it('[TEST-W12] normaliza el nombre del archivo antes de usarlo como clave (REQ-204)', async () => {
    const { media } = await subir({ nombre: 'Sordina Trombón (Tudel Ancho).PNG' });

    expect(media!.key).toContain('-sordina-trombon-tudel-ancho.png');
  });

  it('[TEST-W13] la travesía de directorios no escapa del prefijo (REQ-203, INV-1)', async () => {
    // El nombre lo elige quien sube desde el panel: es entrada hostil.
    const { media } = await subir({ nombre: '../../../secreto.png' });

    expect(media!.key.startsWith('productos/')).toBe(true);
    expect(media!.key).not.toContain('..');
    expect(await env.MEDIA.get(media!.key)).not.toBeNull();
  });

  it.each([
    ['carpeta fuera del enum', { carpeta: 'privado' }],
    ['tipo no permitido (SVG es XSS almacenado)', { tipo: 'image/svg+xml' }],
    ['tipo no permitido (HTML)', { tipo: 'text/html' }],
  ])('[TEST-W14] rechaza con 400: %s (REQ-202)', async (_caso, opciones) => {
    const { status, sobre } = await subir(opciones);

    expect(status).toBe(400);
    expect(sobre.success).toBe(false);
    expect(sobre.data).toBeNull();
  });

  it('[TEST-W15] dos subidas del mismo nombre no se pisan (REQ-207)', async () => {
    // En R2 un PUT sobre una clave existente sobrescribe sin avisar.
    const a = await subir();
    const b = await subir();

    expect(a.media!.key).not.toBe(b.media!.key);
    expect(await env.MEDIA.get(a.media!.key)).not.toBeNull();
    expect(await env.MEDIA.get(b.media!.key)).not.toBeNull();
  });

  it('[TEST-W16] la respuesta no expone el nombre del bucket (Regla 4.3)', async () => {
    // El endpoint captura el error crudo —que puede traer configuración interna—
    // y devuelve texto genérico. Es el motivo de BZ-14.
    const { sobre } = await subir();

    expect(JSON.stringify(sobre)).not.toContain('barzol-web');
  });
});
