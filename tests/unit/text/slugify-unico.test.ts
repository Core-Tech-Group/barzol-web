import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * REQ-301 no se puede comprobar con una aserción sobre valores: dice dónde
 * DEBE vivir la función, no qué debe devolver. Se verifica leyendo el código.
 *
 * El PLAN de SPEC-003 lo daba por cubierto "por el gate de trazabilidad", y el
 * propio gate lo desmintió: reportó REQ-301 como hueco. Tenía razón — el gate
 * comprueba que un REQ esté citado en algún test, no el REQ en sí.
 */
const MAPPERS = [
  'src/shared/lib/categorias/categoriaMapper.ts',
  'src/shared/lib/productos/productoMapper.ts',
];

describe('SPEC-003 · emplazamiento único (REQ-301)', () => {
  it.each(MAPPERS)('[TEST-330] %s importa slugify en vez de declararlo', (ruta) => {
    // Arrange
    const fuente = readFileSync(ruta, 'utf8');

    // Act & Assert
    expect(fuente).toMatch(/import \{ slugify \} from '\.\.\/text\/slugify';/);
    expect(fuente).not.toMatch(/function slugify\s*\(/);
  });

  it('[TEST-331] solo existe una definición de slugify en todo src/', () => {
    // Arrange — la variante `limpiar` de mediaKey.ts queda fuera a propósito:
    // comparte forma pero no contrato (trunca a 60, no aplica trim).
    const fuente = readFileSync('src/shared/lib/text/slugify.ts', 'utf8');

    // Assert
    expect(fuente).toMatch(/export function slugify\s*\(/);
  });
});
