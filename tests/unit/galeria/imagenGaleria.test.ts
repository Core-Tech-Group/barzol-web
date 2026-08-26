import { describe, expect, it } from 'vitest';
import { estadoImagen, esUrlPublica } from '../../../src/shared/lib/galeria/imagenGaleria';

/**
 * Capa 1 · SPEC-905 REQ-981, REQ-983.
 *
 * Una sola función decide si el valor de `image_url` sirve, y la usan las tres
 * partes que necesitan saberlo: el esquema del endpoint, el panel y la galería
 * pública. Tenerla en un sitio es lo que impide que el panel acepte algo que el
 * servidor rechaza, o que la landing intente pintar un `<img>` con basura.
 */

describe('SPEC-905 · estadoImagen · clasificar lo que hay guardado', () => {
  it.each([
    ['[TEST-520] URL pública de R2', 'https://media.barzol.test/galeria/2026/08/uuid-foto.webp', 'ok'],
    ['[TEST-520] URL http sin cifrar', 'http://media.barzol.test/a.png', 'ok'],
    ['[TEST-521] el caso real de producción', 'firefox_ix0xISR5X0.png', 'invalida'],
    ['[TEST-521] el otro caso real', 'firefox_BmzQRtw9Ue.png', 'invalida'],
    ['[TEST-520] ruta relativa', '/imagenes/foto.png', 'invalida'],
    ['[TEST-520] data: URI', 'data:image/png;base64,iVBORw0KGgo=', 'invalida'],
    ['[TEST-520] blob: del navegador', 'blob:https://barzol.test/9f3a-1', 'invalida'],
    ['[TEST-520] texto suelto', 'foto bonita', 'invalida'],
    ['[TEST-520] cadena vacía', '', 'ausente'],
    ['[TEST-520] solo espacios', '   ', 'ausente'],
    ['[TEST-520] null', null, 'ausente'],
    ['[TEST-520] undefined', undefined, 'ausente'],
  ])('%s', (_caso, valor, esperado) => {
    // Act
    const estado = estadoImagen(valor);

    // Assert
    expect(estado).toBe(esperado);
  });

  it('[TEST-520] distingue "ausente" de "invalida" a propósito', () => {
    // No es una sutileza: una tarjeta nueva sin foto y una tarjeta con un
    // nombre de archivo guardado piden cosas distintas al administrador. La
    // primera dice "subí una"; la segunda, "esta no sirve, volvé a subirla".
    // Assert
    expect(estadoImagen(null)).not.toBe(estadoImagen('firefox_ix0xISR5X0.png'));
  });
});

describe('SPEC-905 · esUrlPublica · lo que se puede persistir (REQ-981)', () => {
  it('[TEST-520] acepta una URL absoluta http(s)', () => {
    // Assert
    expect(esUrlPublica('https://media.barzol.test/galeria/2026/08/uuid-foto.webp')).toBe(true);
  });

  it.each([
    ['[TEST-521] nombre de archivo', 'firefox_ix0xISR5X0.png'],
    ['[TEST-520] ruta relativa', '/galeria/foto.png'],
    ['[TEST-520] data:', 'data:image/png;base64,iVBORw0KGgo='],
    ['[TEST-520] blob:', 'blob:https://barzol.test/9f3a-1'],
    ['[TEST-520] javascript:', 'javascript:alert(1)'],
    ['[TEST-520] protocolo raro', 'ftp://media.barzol.test/a.png'],
    ['[TEST-520] vacío', ''],
  ])('%s se rechaza', (_caso, valor) => {
    // Assert
    expect(esUrlPublica(valor)).toBe(false);
  });

  it('[TEST-520] no se deja engañar por espacios ni mayúsculas', () => {
    // Assert
    expect(esUrlPublica('  HTTPS://media.barzol.test/a.png  ')).toBe(true);
    expect(esUrlPublica('  DATA:image/png;base64,x')).toBe(false);
  });
});
