import { afterEach, describe, expect, it } from 'vitest';
import { buildMediaKey, sanitizeFileName } from '../../../src/shared/lib/storage/mediaKey';

const UUID_FIJO = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const CLAVE = /^(productos|galeria|home)\/\d{4}\/\d{2}\/[0-9a-f-]{36}-.+$/;

describe('SPEC-002 · sanitizeFileName', () => {
  it.each([
    ['[TEST-101] nombre limpio', 'foto.webp', 'foto.webp', 'REQ-204'],
    ['[TEST-102] tildes', 'sordina-trombón.webp', 'sordina-trombon.webp', 'REQ-204'],
    ['[TEST-103] espacios y mayúsculas', 'Atril De Celular.PNG', 'atril-de-celular.png', 'REQ-204'],
    [
      '[TEST-104] paréntesis (caso real del catálogo)',
      'Atril para trombón (tudel delgado).jpg',
      'atril-para-trombon-tudel-delgado.jpg',
      'REQ-204',
    ],
    ['[TEST-105] ruta POSIX', '../../etc/passwd', 'passwd', 'REQ-203'],
    ['[TEST-106] ruta Windows', 'C:\\Users\\willy\\foto.webp', 'foto.webp', 'REQ-203'],
    ['[TEST-107] solo símbolos', '!!!.webp', 'archivo.webp', 'REQ-206'],
    ['[TEST-108] cadena vacía', '', 'archivo', 'REQ-206'],
    ['[TEST-109] sin extensión', 'mi archivo', 'mi-archivo', 'REQ-205'],
    ['[TEST-110] punto inicial (archivo oculto)', '.gitignore', 'gitignore', 'REQ-205'],
  ])('%s → %s (%s)', (_caso, entrada, esperado) => {
    // Act
    const limpio = sanitizeFileName(entrada);

    // Assert
    expect(limpio).toBe(esperado);
  });

  it('[TEST-111] trunca la base a 60 caracteres (REQ-206)', () => {
    // Arrange
    const largo = `${'a'.repeat(120)}.webp`;

    // Act
    const limpio = sanitizeFileName(largo);

    // Assert
    expect(limpio).toBe(`${'a'.repeat(60)}.webp`);
  });

  it('[TEST-112] es idempotente (INV-3)', () => {
    const entradas = [
      'foto.webp',
      'sordina-trombón.webp',
      'Atril De Celular.PNG',
      'Atril para trombón (tudel delgado).jpg',
      '../../etc/passwd',
      'C:\\Users\\willy\\foto.webp',
      '!!!.webp',
      '',
      'mi archivo',
      '.gitignore',
      `${'a'.repeat(120)}.webp`,
      'Piñón güiro.WEBP',
    ];

    for (const entrada of entradas) {
      const unaVez = sanitizeFileName(entrada);
      expect(sanitizeFileName(unaVez)).toBe(unaVez);
    }
  });
});

describe('SPEC-002 · buildMediaKey — firma actual', () => {
  it('[TEST-113] la clave tiene la forma carpeta/AAAA/MM/uuid-nombre (REQ-201, REQ-207)', () => {
    // Act
    const clave = buildMediaKey('productos', 'foto.webp');

    // Assert
    expect(clave).toMatch(CLAVE);
  });

  it('[TEST-114] el mes siempre ocupa dos dígitos (REQ-201)', () => {
    const [, , mes] = buildMediaKey('home', 'x.png').split('/');

    expect(mes).toHaveLength(2);
  });

  it('[TEST-115] la travesía de directorios no sobrevive (REQ-203, INV-1)', () => {
    const clave = buildMediaKey('galeria', '../../secreto.webp');

    expect(clave).not.toContain('..');
    expect(clave).not.toContain('\\');
    expect(clave).toMatch(CLAVE);
  });

  it('[TEST-116] la clave empieza por la carpeta pedida (REQ-202, INV-2)', () => {
    expect(buildMediaKey('galeria', 'a.webp').startsWith('galeria/')).toBe(true);
  });

  it('[TEST-117] cien subidas del mismo nombre dan cien claves distintas (REQ-207)', () => {
    // En R2 un PUT sobre una clave existente sobrescribe sin avisar: si dos
    // archivos llamados igual colisionaran, el segundo borraría al primero.
    const claves = new Set(
      Array.from({ length: 100 }, () => buildMediaKey('productos', 'foto.webp'))
    );

    expect(claves.size).toBe(100);
  });
});

describe('SPEC-002 · buildMediaKey — determinismo inyectado (REQ-208)', () => {
  const tzOriginal = process.env.TZ;
  afterEach(() => {
    process.env.TZ = tzOriginal;
  });

  it('[TEST-120] con instante e id fijos la clave es completamente determinista (INV-5)', () => {
    // Arrange
    const deps = {
      ahora: () => new Date('2026-08-21T14:30:00Z'),
      nuevoId: () => UUID_FIJO,
    };

    // Act
    const clave = buildMediaKey('productos', 'foto.webp', deps);

    // Assert
    expect(clave).toBe(`productos/2026/08/${UUID_FIJO}-foto.webp`);
  });

  it('[TEST-121] enero se rellena a dos dígitos (REQ-201)', () => {
    const clave = buildMediaKey('home', 'x.png', {
      ahora: () => new Date('2026-01-05T00:00:00Z'),
      nuevoId: () => UUID_FIJO,
    });

    expect(clave).toBe(`home/2026/01/${UUID_FIJO}-x.png`);
  });

  it('[TEST-122] archiva por UTC, no por la hora local de Perú (REQ-201)', () => {
    // Arrange — Barzol está en UTC-5. A las 02:00 UTC del 1 de enero, en Lima
    // todavía son las 21:00 del 31 de diciembre: con hora local el archivo se
    // guardaría bajo 2025/12 y quedaría fuera de su carpeta.
    process.env.TZ = 'America/Lima';

    // Act
    const clave = buildMediaKey('galeria', 'x.png', {
      ahora: () => new Date('2026-01-01T02:00:00Z'),
      nuevoId: () => UUID_FIJO,
    });

    // Assert
    expect(clave).toBe(`galeria/2026/01/${UUID_FIJO}-x.png`);
  });

  it('[TEST-123] la firma de dos argumentos sigue funcionando (REQ-208)', () => {
    // El test de no regresión: `deps` es opcional para que ninguna llamada
    // existente cambie. Si esto falla, BZ-62 rompió código en producción.
    expect(() => buildMediaKey('home', 'x.png')).not.toThrow();
    expect(buildMediaKey('home', 'x.png')).toMatch(CLAVE);
  });

  it('[TEST-124] misma entrada, misma salida (INV-5)', () => {
    const deps = {
      ahora: () => new Date('2026-03-09T08:00:00Z'),
      nuevoId: () => UUID_FIJO,
    };

    expect(buildMediaKey('productos', 'a b.webp', deps)).toBe(
      buildMediaKey('productos', 'a b.webp', deps)
    );
  });
});
