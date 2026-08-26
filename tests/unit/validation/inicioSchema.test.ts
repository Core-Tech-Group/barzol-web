import { describe, expect, it } from 'vitest';
import { inicioWriteSchema } from '../../../src/shared/lib/validation/inicioSchema';

/**
 * Capa 1 · SPEC-904 REQ-977, REQ-978, REQ-975 — la puerta del endpoint.
 *
 * El panel ya valida en el cliente, y eso no cuenta: `PUT /api/inicio` es
 * alcanzable con `curl` y una cookie de sesión. Lo que se prueba acá es lo que
 * pasa cuando nadie pasó por la isla.
 */

const seccion = (extra: Record<string, unknown> = {}) => ({
  id: null,
  tipo: 'seccion',
  titulo: 'Soportes para celular',
  visible: true,
  productoIds: ['7'],
  ...extra,
});

const banner = (extra: Record<string, unknown> = {}) => ({
  id: null,
  tipo: 'banner',
  visible: true,
  link: 'https://barzol.test/catalogo',
  imagenUrl: 'https://media.barzol.test/home/2026/08/uuid-banner.webp',
  ...extra,
});

const cuerpo = (items: unknown[], heroImages: unknown[] = []) => ({ heroImages, items });

describe('SPEC-904 · inicioWriteSchema · lo que acepta', () => {
  it('[TEST-501] acepta un cuerpo completo y bien formado', () => {
    // Act
    const r = inicioWriteSchema.safeParse(cuerpo([seccion(), banner()], ['https://media.barzol.test/a.webp', null]));

    // Assert
    expect(r.success).toBe(true);
  });

  it('[TEST-501] acepta el inicio vacío: es un estado legítimo', () => {
    // Act
    const r = inicioWriteSchema.safeParse(cuerpo([]));

    // Assert
    expect(r.success).toBe(true);
  });

  it('[TEST-501] acepta una sección sin productos todavía', () => {
    // Act
    const r = inicioWriteSchema.safeParse(cuerpo([seccion({ productoIds: [] })]));

    // Assert
    expect(r.success).toBe(true);
  });
});

describe('SPEC-904 · inicioWriteSchema · lo que rechaza (REQ-977)', () => {
  it.each([
    ['[TEST-502] sección con título vacío (REQ-978)', [seccion({ titulo: '' })]],
    ['[TEST-502] sección con título en blanco (REQ-978)', [seccion({ titulo: '   ' })]],
    ['[TEST-501] tipo desconocido', [seccion({ tipo: 'carrusel' })]],
    ['[TEST-501] tipo en el vocabulario de la columna, no del dominio', [seccion({ tipo: 'section' })]],
    ['[TEST-501] productoIds ausente en una sección', [{ id: null, tipo: 'seccion', titulo: 'X', visible: true }]],
    ['[TEST-501] productoIds con algo que no es texto', [seccion({ productoIds: [7] })]],
    ['[TEST-501] visible no booleano', [seccion({ visible: 'sí' })]],
    ['[TEST-501] banner con link que no es texto', [banner({ link: 42 })]],
  ])('%s', (_caso, items) => {
    // Act
    const r = inicioWriteSchema.safeParse(cuerpo(items));

    // Assert
    expect(r.success).toBe(false);
  });

  it('[TEST-501] rechaza un cuerpo sin `items`', () => {
    // Act
    const r = inicioWriteSchema.safeParse({ heroImages: [] });

    // Assert
    expect(r.success).toBe(false);
  });
});

describe('SPEC-904 · inicioWriteSchema · nada de base64 (REQ-975)', () => {
  it('[TEST-504] rechaza una data: URI en la imagen de un banner', () => {
    // Act
    const r = inicioWriteSchema.safeParse(cuerpo([banner({ imagenUrl: 'data:image/png;base64,iVBORw0KGgo=' })]));

    // Assert — el sitio serviría ese base64 en cada visita a la portada. Es
    // `BZ-77`, y dejarlo entrar por acá lo empeoraría en vez de heredarlo.
    expect(r.success).toBe(false);
  });

  it('[TEST-504] rechaza una data: URI en una imagen hero', () => {
    // Act
    const r = inicioWriteSchema.safeParse(cuerpo([], ['data:image/webp;base64,UklGRg==']));

    // Assert
    expect(r.success).toBe(false);
  });

  it('[TEST-504] no se deja engañar por mayúsculas ni espacios delante', () => {
    // Act
    const r = inicioWriteSchema.safeParse(cuerpo([banner({ imagenUrl: '  DATA:image/png;base64,iVBORw0KGgo=' })]));

    // Assert
    expect(r.success).toBe(false);
  });

  it('[TEST-504] un banner sin imagen sigue siendo válido', () => {
    // Act
    const r = inicioWriteSchema.safeParse(cuerpo([banner({ imagenUrl: null })]));

    // Assert
    expect(r.success).toBe(true);
  });
});
