import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { buildMediaKey } from '../../src/shared/lib/storage/mediaKey';

/**
 * Primer test de Capa 3 (BZ-59). Verifica que el entorno de prueba tiene los
 * bindings REALES de Miniflare, no dobles.
 *
 * Constitución 5.1: acá no se mockea R2. Se escribe en el bucket que levanta
 * Miniflare y se lee lo que quedó. Un mock demostraría que el mock funciona.
 */
describe('Capa 3 · bindings de Miniflare', () => {
  it('[TEST-W00] el binding MEDIA es un bucket R2 real, con ida y vuelta', async () => {
    // Arrange — la clave se construye con la misma función que usa producción,
    // con instante e id fijos para que el test sea determinista (SPEC-002).
    const clave = buildMediaKey('productos', 'sordina trompeta.webp', {
      ahora: () => new Date('2026-08-22T00:00:00Z'),
      nuevoId: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    });
    const contenido = new Uint8Array([0x52, 0x49, 0x46, 0x46]); // cabecera RIFF/WEBP

    // Act
    await env.MEDIA.put(clave, contenido, {
      httpMetadata: { contentType: 'image/webp' },
    });
    const guardado = await env.MEDIA.get(clave);

    // Assert
    expect(guardado).not.toBeNull();
    expect(guardado!.httpMetadata?.contentType).toBe('image/webp');
    expect(new Uint8Array(await guardado!.arrayBuffer())).toEqual(contenido);
  });

  it('[TEST-W00b] una clave inexistente devuelve null, no lanza', async () => {
    expect(await env.MEDIA.get('productos/2026/08/no-existe.webp')).toBeNull();
  });

  it('[TEST-W00c] el binding SESSION existe y es un KV', async () => {
    // SESSION lo inyecta @astrojs/cloudflare v14: no está en wrangler.jsonc
    // pero sí en producción. Si falta acá, el entorno de prueba diverge.
    await env.SESSION.put('clave', 'valor');

    expect(await env.SESSION.get('clave')).toBe('valor');
  });

  it('[TEST-W00d] las variables públicas llegan al worker', () => {
    expect(env.BARZOL_SUPABASE_URL).toBeTruthy();
    expect(env.BARZOL_R2_PUBLIC_URL).toBeTruthy();
  });
});
