import { describe, expect, it, vi } from 'vitest';
import { construirCuerpo, guardarInicio } from '../../../src/admin/inicio/guardarInicio';
import type { ItemIsla } from '../../../src/admin/inicio/guardarInicio';

/**
 * SPEC-904 — la orquestación del guardado del inicio.
 *
 * Vive fuera de `InicioAdmin.tsx` por dos motivos. El primero es `BZ-79`: el
 * componente ya tiene 835 líneas y meterle esto lo empujaría hacia las 900 en
 * la dirección contraria. El segundo es éste: aquí se puede probar sin montar
 * la capa 2, que sigue bloqueada por `BZ-60`.
 *
 * El `fetch` se inyecta por parámetro con un valor por defecto en vez de
 * parchear el global. No es ceremonia: un test que sustituye `globalThis.fetch`
 * se lleva por delante a cualquier otro que corra en paralelo en el mismo
 * fichero.
 */

const seccion = (id: string, title: string, products: string[] = []): ItemIsla =>
  ({ id, type: 'section', title, visible: true, products });

const banner = (id: string, image: string | null = null, link = ''): ItemIsla =>
  ({ id, type: 'banner', visible: true, link, image });

// Los parámetros se declaran aunque no se usen: sin ellos `mock.calls` queda
// tipado como `[]` y no se puede leer lo que se envió.
const ok = () =>
  vi.fn(async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ success: true, data: null, message: null }), { status: 200 })
  );

const falla = (status = 500, message = 'permission denied for table home_item') =>
  vi.fn(async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ success: false, data: null, message }), { status })
  );

describe('SPEC-904 · construirCuerpo · lo que sale hacia el servidor', () => {
  it('[TEST-510] los productos viajan como id, nunca como nombre (REQ-974)', () => {
    // Arrange — la isla trabaja con ids desde esta SPEC; el nombre es solo
    // para pintar. El catálogo real tiene "Soporte de Celular Trompeta" y
    // "Soporte de Celular Trompeta (copia)": por nombre son indistinguibles
    // en cuanto alguien renombre uno.
    const items = [seccion('10', 'Soportes', ['7', '3'])];

    // Act
    const cuerpo = construirCuerpo(items, []);

    // Assert
    expect(cuerpo.items[0]).toMatchObject({ id: '10', tipo: 'seccion', productoIds: ['7', '3'] });
  });

  it('[TEST-510] un id provisional de la isla se traduce a null', () => {
    // `new-<timestamp>-<n>` es una convención interna de InicioAdmin para lo
    // que todavía no existe en la base. Éste es el único punto donde cruza al
    // servidor, y cruza convertido.
    // Arrange
    const items = [seccion('new-1756100000000-1', 'Recién creada')];

    // Act
    const cuerpo = construirCuerpo(items, []);

    // Assert
    expect(cuerpo.items[0].id).toBeNull();
  });

  it('[TEST-510] el orden del array se conserva tal cual', () => {
    // Act
    const cuerpo = construirCuerpo([banner('1'), seccion('2', 'Media'), banner('3')], []);

    // Assert
    expect(cuerpo.items.map((i) => i.tipo)).toEqual(['banner', 'seccion', 'banner']);
  });

  it('[TEST-510] recorta el título y descarta el campo `open` de la isla', () => {
    // Arrange — `open`, `isNew` y demás son estado de presentación.
    const items: ItemIsla[] = [{ id: '10', type: 'section', title: '  Sordinas  ', visible: false, products: [], open: true }];

    // Act
    const cuerpo = construirCuerpo(items, []);

    // Assert
    expect(cuerpo.items[0]).toEqual({ id: '10', tipo: 'seccion', titulo: 'Sordinas', visible: false, productoIds: [] });
  });

  it('[TEST-504] rechaza una imagen en base64 antes de enviarla (REQ-975)', () => {
    // Arrange
    const items = [banner('1', 'data:image/png;base64,iVBORw0KGgo=')];

    // Act
    const construir = () => construirCuerpo(items, []);

    // Assert — el servidor también lo rechaza, con un mensaje técnico que
    // nombra el esquema `data:`. Fallar acá le dice al administrador qué imagen
    // es y qué hacer, y evita mandar medio megabyte de base64 para nada.
    expect(construir).toThrow(/todavía no se subió/i);
  });

  it('[TEST-504] rechaza una imagen hero en base64', () => {
    // Act
    const construir = () => construirCuerpo([], ['data:image/png;base64,iVBORw0KGgo=']);

    // Assert
    expect(construir).toThrow(/portada 1/i);
  });
});

describe('SPEC-904 · guardarInicio · la petición', () => {
  it('[TEST-505] envía una sola petición PUT a /api/inicio (REQ-971)', async () => {
    // Arrange
    const enviar = ok();

    // Act
    await guardarInicio([seccion('10', 'Soportes')], [], enviar);

    // Assert — una, no una por item: el orden es propiedad del conjunto.
    expect(enviar).toHaveBeenCalledTimes(1);
    const [url, init] = enviar.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/inicio');
    expect(init.method).toBe('PUT');
  });

  it('[TEST-505] el cuerpo va como JSON con su content-type', async () => {
    // Arrange
    const enviar = ok();

    // Act
    await guardarInicio([seccion('10', 'Soportes', ['7'])], ['https://r2.test/a.webp'], enviar);

    // Assert
    const [, init] = enviar.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('content-type')).toContain('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      heroImages: ['https://r2.test/a.webp'],
      items: [{ id: '10', tipo: 'seccion', titulo: 'Soportes', visible: true, productoIds: ['7'] }],
    });
  });
});

describe('SPEC-904 · guardarInicio · el fallo no se traga (REQ-972b, REQ-973)', () => {
  it('[TEST-511] un error del servidor se propaga con su mensaje', async () => {
    // Arrange
    const enviar = falla(403, 'new row violates row-level security policy');

    // Act + Assert — es exactamente el error que devolverá la base hasta que
    // se apliquen las policies de REQ-979, y el administrador tiene que verlo.
    await expect(guardarInicio([seccion('10', 'Soportes')], [], enviar)).rejects.toThrow(
      /row-level security/
    );
  });

  it('[TEST-511] un 200 con success:false también es un fallo', async () => {
    // El sobre `ApiResponse` puede decir que no con estado 200. Mirar solo
    // `res.ok` es cómo se construye un guardado que miente.
    // Arrange
    const enviar = falla(200, 'no se pudo guardar');

    // Act + Assert
    await expect(guardarInicio([], [], enviar)).rejects.toThrow(/no se pudo guardar/);
  });

  it('[TEST-500] una respuesta ilegible es un fallo, no un éxito (REQ-970)', async () => {
    // Arrange — un HTML de error de Cloudflare, por ejemplo.
    const enviar = vi.fn(async () => new Response('<html>502</html>', { status: 502 }));

    // Act + Assert
    await expect(guardarInicio([], [], enviar)).rejects.toThrow();
  });

  it('[TEST-500] si la red cae, el fallo llega al llamador (REQ-970)', async () => {
    // Arrange
    const enviar = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });

    // Act + Assert — quien llama mantiene el estado sucio; ésta es la
    // diferencia entre perder el trabajo y poder reintentar.
    await expect(guardarInicio([], [], enviar)).rejects.toThrow(/Failed to fetch/);
  });

  it('[TEST-507] en el camino feliz resuelve sin lanzar', async () => {
    // Act + Assert
    await expect(guardarInicio([seccion('10', 'Soportes')], [], ok())).resolves.toBeUndefined();
  });
});
