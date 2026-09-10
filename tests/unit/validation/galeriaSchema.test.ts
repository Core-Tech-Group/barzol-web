import { describe, expect, it } from 'vitest';
import { galeriaWriteSchema } from '../../../src/shared/lib/validation/galeriaSchema';

/**
 * Capa 1 · SPEC-905 REQ-981 — la puerta de `POST`/`PUT /api/galeria`.
 *
 * El panel ya no deja guardar una imagen inválida, y eso no basta: la ruta es
 * alcanzable con `curl` y una cookie de sesión. Además, hasta hoy el propio
 * panel era quien mandaba la basura, así que confiar en el cliente es
 * exactamente el error que produjo `BZ-82`.
 */

const cuerpo = (extra: Record<string, unknown> = {}) => ({
  tipo: 'accesorios',
  titulo: 'Sordina con logo de banda',
  imagenUrl: 'https://media.barzol.test/galeria/2026/08/uuid-foto.webp',
  orden: 0,
  ...extra,
});

describe('SPEC-905 · galeriaWriteSchema · lo que acepta', () => {
  it('[TEST-522] acepta un cuerpo con una URL pública', () => {
    // Act
    const r = galeriaWriteSchema.safeParse(cuerpo());

    // Assert
    expect(r.success).toBe(true);
  });

  it('[TEST-522] acepta las tres galerías', () => {
    // Assert
    expect(galeriaWriteSchema.safeParse(cuerpo({ tipo: 'trabajos' })).success).toBe(true);
    expect(galeriaWriteSchema.safeParse(cuerpo({ tipo: 'accesorios' })).success).toBe(true);
    expect(galeriaWriteSchema.safeParse(cuerpo({ tipo: 'diseno' })).success).toBe(true);
  });
});

describe('SPEC-905 · galeriaWriteSchema · lo que rechaza (REQ-981)', () => {
  it.each([
    ['[TEST-521] el nombre de archivo que guardaba el panel', 'firefox_ix0xISR5X0.png'],
    ['[TEST-521] el otro nombre real', 'firefox_BmzQRtw9Ue.png'],
    ['[TEST-522] ruta relativa', '/galeria/foto.png'],
    ['[TEST-522] data: URI', 'data:image/png;base64,iVBORw0KGgo='],
    ['[TEST-522] blob: del navegador', 'blob:https://barzol.test/9f3a-1'],
    ['[TEST-522] javascript:', 'javascript:alert(1)'],
    ['[TEST-522] cadena vacía', ''],
  ])('%s', (_caso, imagenUrl) => {
    // Act
    const r = galeriaWriteSchema.safeParse(cuerpo({ imagenUrl }));

    // Assert
    expect(r.success).toBe(false);
  });

  it('[TEST-522] rechaza `imagenUrl` nulo', () => {
    // `gallery_item.image_url` es NOT NULL (schema.sql:183): una fila sin
    // imagen no es un estado que la base admita.
    // Act
    const r = galeriaWriteSchema.safeParse(cuerpo({ imagenUrl: null }));

    // Assert
    expect(r.success).toBe(false);
  });

  it('[TEST-522] sigue rechazando el título vacío', () => {
    // Act
    const r = galeriaWriteSchema.safeParse(cuerpo({ titulo: '   ' }));

    // Assert
    expect(r.success).toBe(false);
  });

  it('[TEST-522] el mensaje de error no nombra la tabla', () => {
    // Regla 4.3, el motivo de `BZ-14`.
    // Act
    const r = galeriaWriteSchema.safeParse(cuerpo({ imagenUrl: 'firefox_ix0xISR5X0.png' }));

    // Assert
    const mensajes = r.success ? '' : JSON.stringify(r.error.issues);
    expect(mensajes).not.toMatch(/gallery_item/);
  });
});
