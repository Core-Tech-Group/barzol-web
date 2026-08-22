import { describe, expect, it } from 'vitest';
import { slugify } from '../../../src/shared/lib/text/slugify';
import { slugifyLegacy } from '../../fixtures/slugify-legacy';
import { CORPUS } from '../../fixtures/nombres-reales';

describe('SPEC-003 · slugify — comportamiento', () => {
  it.each([
    ['[TEST-301] nombre simple', 'Soportes', 'soportes'],
    ['[TEST-303] tildes', 'Trombón', 'trombon'],
    ['[TEST-304] diéresis y eñe', 'Piñón güiro', 'pinon-guiro'],
    [
      '[TEST-305] paréntesis (caso real del catálogo)',
      'Atril de celular para trombón (tudel delgado)',
      'atril-de-celular-para-trombon-tudel-delgado',
    ],
    ['[TEST-306] espacios al borde', '  Soportes  ', 'soportes'],
    ['[TEST-307] espacios múltiples internos', 'Sordina    trompeta', 'sordina-trompeta'],
    ['[TEST-308] símbolos colapsados', 'BERP / trompeta & trombón', 'berp-trompeta-trombon'],
    ['[TEST-309] números conservados', 'Barzol 3D Industry', 'barzol-3d-industry'],
    ['[TEST-310] guiones ya presentes', 'soporte--celular', 'soporte-celular'],
  ])('%s (REQ-302)', (_caso, entrada, esperado) => {
    // Arrange — la entrada es el nombre tal como se administra en el panel.

    // Act
    const slug = slugify(entrada);

    // Assert
    expect(slug).toBe(esperado);
  });

  it.each([
    ['[TEST-311] entrada vacía', ''],
    ['[TEST-312] solo símbolos', '!!!'],
    ['[TEST-313] solo espacios', '   '],
  ])('%s devuelve cadena vacía, no un sustituto (REQ-304)', (_caso, entrada) => {
    // Act
    const slug = slugify(entrada);

    // Assert — contrato explícito: vacío, NO 'producto' ni ningún relleno.
    expect(slug).toBe('');
  });

  it('[TEST-314] es idempotente sobre todo el corpus (REQ-305, INV-4)', () => {
    // Act & Assert
    for (const nombre of CORPUS) {
      const unaVez = slugify(nombre);
      expect(slugify(unaVez)).toBe(unaVez);
    }
  });

  it('[TEST-315] cumple INV-1..3 sobre todo el corpus', () => {
    for (const nombre of CORPUS) {
      const slug = slugify(nombre);

      expect(slug).toMatch(/^[a-z0-9-]*$/); // INV-1
      expect(slug).not.toMatch(/^-|-$/); // INV-2
      expect(slug).not.toContain('--'); // INV-3
    }
  });
});

describe('SPEC-003 · slugify — no regresión (REQ-303)', () => {
  it('[TEST-320/321] produce lo mismo que la implementación que reemplaza', () => {
    // Arrange — `slugifyLegacy` es la copia congelada de lo que había en los
    // dos mappers. Verificado en TEST-322: eran idénticas entre sí.

    // Act & Assert — el slug es la URL pública y no se persiste. Una sola
    // diferencia acá significa enlaces rotos en producción sin migración.
    for (const nombre of CORPUS) {
      expect(slugify(nombre)).toBe(slugifyLegacy(nombre));
    }
  });

  it('[TEST-322] las dos copias originales eran equivalentes entre sí', () => {
    // Este test quedó como registro histórico. Se comprobó el 2026-08-22
    // leyendo ambos archivos: `categoriaMapper.ts:17` y `productoMapper.ts:34`
    // tenían el mismo cuerpo carácter por carácter, así que `slugifyLegacy`
    // representa a las dos y la extracción de BZ-61 es segura.
    //
    // Si hubieran diferido, esto no habría sido un refactor sino un bug vivo:
    // categorías y productos generando rutas con reglas distintas.
    expect(slugifyLegacy('Trombón')).toBe('trombon');
  });
});
