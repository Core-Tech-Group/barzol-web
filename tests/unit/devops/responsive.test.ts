import { describe, expect, it } from 'vitest';
// Los gates son .mjs sin tipos propios; TypeScript los resuelve igual, y se
// prueban como cualquier otro módulo (SPEC-900 INV-1).
import { revisarContrato, revisarFuente, revisarPanel } from '../../../scripts/sdd/responsive.mjs';

/**
 * SPEC-906 REQ-997 — el verificador de responsive del panel.
 *
 * **Lo que se prueba aquí es el detector, no el aspecto de la página.** Una
 * hoja de estilos no tiene comportamiento que un test unitario pueda observar,
 * y montar jsdom para medir píxeles mediría jsdom. Que el panel se vea bien solo
 * lo pueden decir `BZ-74` (E2E con viewports) y una persona con un teléfono.
 *
 * Lo que sí evita esto es la causa: el panel llegó a tener 3 media queries
 * frente a las 18 de la landing porque nada avisaba. Un documento que dice
 * "acordate del móvil" no lo impide; un check que falla, sí.
 */

interface Hallazgo {
  tipo: string;
  archivo: string;
  detalle: string;
}

const tipos = (h: Hallazgo[]) => h.map((x) => x.tipo);

describe('SPEC-906 · revisarFuente · alto del viewport (INV-1)', () => {
  it('[TEST-540] marca `100vh` en la caja que contiene el scroll del panel', () => {
    // Arrange — es el AdminLayout de antes de esta SPEC: el padre no scrollea,
    // así que lo que quede fuera del viewport visible es inalcanzable.
    const fuente = `<div style="height:100vh; display:flex; overflow:hidden;">`;

    // Act
    const hallazgos = revisarFuente('src/admin/layout/AdminLayout.astro', fuente) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).toContain('RESPONSIVE-VH');
  });

  it('[TEST-540] marca `min-height:100vh` igual', () => {
    // Arrange — el login usaba esta variante.
    const fuente = `<div style="min-height:100vh; display:grid;">`;

    // Act
    const hallazgos = revisarFuente('src/admin/login/LoginView.astro', fuente) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).toContain('RESPONSIVE-VH');
  });

  it('[TEST-541] no marca `100dvh`, que es el arreglo', () => {
    // Act
    const hallazgos = revisarFuente('src/admin/layout/AdminLayout.astro', 'height: 100dvh;') as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).not.toContain('RESPONSIVE-VH');
  });

  it('[TEST-541] no marca el respaldo escrito en dos líneas, que es el real', () => {
    // `height: 100vh` seguido de `height: 100dvh` es la forma correcta de dar
    // respaldo: quien no entienda la unidad se queda con lo de hoy. Y son dos
    // declaraciones, así que en CSS de verdad ocupan dos líneas — la primera
    // versión del detector miraba solo una y marcaba `tokens.css` como error.
    // Arrange
    const fuente = ['.bz-admin-shell {', '\theight: 100vh;', '\theight: 100dvh;', '}'].join('\n');

    // Act
    const hallazgos = revisarFuente('src/shared/styles/tokens.css', fuente) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).not.toContain('RESPONSIVE-VH');
  });

  it('[TEST-541] sigue marcando un `100vh` sin respaldo en la línea siguiente', () => {
    // Arrange
    const fuente = ['.bz-x {', '\theight: 100vh;', '\tdisplay: flex;', '}'].join('\n');

    // Act
    const hallazgos = revisarFuente('src/admin/layout/AdminLayout.astro', fuente) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).toContain('RESPONSIVE-VH');
  });
});

describe('SPEC-906 · revisarFuente · rejillas fijas (INV-2)', () => {
  it('[TEST-542] marca `repeat(3, 1fr)` sin clase que lo gobierne', () => {
    // Arrange — las tarjetas de la galería y las portadas del inicio.
    const fuente = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>`;

    // Act
    const hallazgos = revisarFuente('src/admin/shared/GalleryAdmin.tsx', fuente) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).toContain('RESPONSIVE-GRID');
  });

  it('[TEST-542] marca también la variante sin espacio', () => {
    // Act
    const hallazgos = revisarFuente('src/admin/x.astro', `grid-template-columns:repeat(3,1fr);`) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).toContain('RESPONSIVE-GRID');
  });

  it('[TEST-543] acepta la rejilla que sí lleva su clase responsive', () => {
    // Arrange — el estilo en línea sigue siendo el valor de escritorio; la
    // clase es la que lo baja a 2 y a 1 columna desde `tokens.css`.
    const fuente = `<div className="bz-grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>`;

    // Act
    const hallazgos = revisarFuente('src/admin/shared/GalleryAdmin.tsx', fuente) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).not.toContain('RESPONSIVE-GRID');
  });

  it('[TEST-543] acepta la forma `class=` de Astro, no solo `className=`', () => {
    // Act
    const hallazgos = revisarFuente(
      'src/admin/dashboard/DashboardView.astro',
      `<div class="bz-grid-cards" style="display:grid; grid-template-columns:repeat(3,1fr);">`
    ) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).not.toContain('RESPONSIVE-GRID');
  });
});

describe('SPEC-906 · revisarFuente · un solo vocabulario (INV-3)', () => {
  it('[TEST-544] marca un punto de ruptura suelto en un componente del panel', () => {
    // Arrange — el `768px` estaba escrito como literal en dos archivos.
    const fuente = `@media (max-width: 768px) { .bz-cms-grid { grid-template-columns: 1fr !important; } }`;

    // Act
    const hallazgos = revisarFuente('src/admin/dashboard/DashboardView.astro', fuente) as Hallazgo[];

    // Assert
    expect(tipos(hallazgos)).toContain('RESPONSIVE-BP');
  });

  it('[TEST-545] no marca el mismo literal en tokens.css, que es su sitio', () => {
    // Act
    const hallazgos = revisarFuente(
      'src/shared/styles/tokens.css',
      `@media (max-width: 768px) { .bz-section-wrap { padding-left: 16px !important; } }`
    ) as Hallazgo[];

    // Assert
    expect(hallazgos).toEqual([]);
  });

  it('[TEST-545] no marca los componentes de la landing', () => {
    // La landing ya resolvió esto a su manera, con 18 media queries repartidas.
    // Cambiarle el criterio no es lo que pide esta SPEC.
    // Act
    const hallazgos = revisarFuente('src/landing/shared/Header.astro', `@media (max-width: 768px) {}`) as Hallazgo[];

    // Assert
    expect(hallazgos).toEqual([]);
  });
});

describe('SPEC-906 · revisarPanel · el repositorio real', () => {
  it('[TEST-546] el panel cumple REQ-990, REQ-993 y REQ-995', () => {
    // Éste es el test que vale. Los anteriores prueban el detector; éste
    // comprueba el código de verdad, y es el que fallará el día que alguien
    // añada una pantalla del panel sin adaptarla.
    // Act
    const hallazgos = revisarPanel() as Hallazgo[];

    // Assert
    expect(hallazgos.map((h) => `${h.archivo}: ${h.detalle}`)).toEqual([]);
  });
});

describe('SPEC-906 · revisarContrato · tokens.css y el marcado, juntos', () => {
  const tokens = [
    '.bz-admin-shell { height: 100vh; height: 100dvh; }',
    '.bz-topbar { flex-wrap: wrap; }',
    '.bz-content-pad {}',
    '.bz-grid-cards {}',
    '.bz-split-auth {}',
    '.bz-auth-brand {}',
    '.bz-table-head {}',
    '.bz-table-row {}',
  ].join('\n');

  const marcado = {
    'src/admin/login/LoginView.astro': '<div class="bz-split-auth"><div class="bz-auth-brand">',
    'src/admin/productos/ProductsAdminList.tsx': 'className="bz-table-head" ... className="admin-product-row bz-table-row"',
    'src/admin/layout/AdminLayout.astro': '<div class="bz-admin-shell">',
  };

  it('[TEST-547] con todo en su sitio no hay hallazgos', () => {
    // Act
    const hallazgos = revisarContrato(tokens, marcado) as Hallazgo[];

    // Assert
    expect(hallazgos).toEqual([]);
  });

  it('[TEST-547] avisa si el login deja de aplicar su clase (REQ-991)', () => {
    // Una clase que desaparece del marcado no rompe nada visible en escritorio:
    // el estilo en línea sigue ahí. Solo se nota en un teléfono.
    // Arrange
    const sinClase = { ...marcado, 'src/admin/login/LoginView.astro': '<div>' };

    // Act
    const hallazgos = revisarContrato(tokens, sinClase) as Hallazgo[];

    // Assert
    expect(hallazgos.map((h) => h.detalle).join(' ')).toMatch(/REQ-991/);
  });

  it('[TEST-547] avisa si la tabla de productos pierde sus clases (REQ-992)', () => {
    // Arrange
    const sinClase = { ...marcado, 'src/admin/productos/ProductsAdminList.tsx': 'display: grid' };

    // Act
    const hallazgos = revisarContrato(tokens, sinClase) as Hallazgo[];

    // Assert
    expect(hallazgos.map((h) => h.detalle).join(' ')).toMatch(/REQ-992/);
  });

  it('[TEST-547] avisa si tokens.css borra una regla que alguien usa', () => {
    // El caso contrario, y igual de silencioso: el CSS no se queja de un
    // selector que no encuentra a nadie, ni el JSX de una clase que no existe.
    // Arrange
    const sinRegla = tokens.replace('.bz-split-auth {}', '');

    // Act
    const hallazgos = revisarContrato(sinRegla, marcado) as Hallazgo[];

    // Assert
    expect(hallazgos.map((h) => h.detalle).join(' ')).toMatch(/falta la regla \.bz-split-auth/);
  });

  it('[TEST-548] avisa si la barra superior no puede envolver (REQ-994)', () => {
    // Arrange — el alto de 68px está en línea en las seis pantallas; sin
    // `flex-wrap` en tokens.css, las acciones se recortan en vez de bajar.
    const sinWrap = tokens.replace('flex-wrap: wrap;', '');

    // Act
    const hallazgos = revisarContrato(sinWrap, marcado) as Hallazgo[];

    // Assert
    expect(hallazgos.map((h) => h.detalle).join(' ')).toMatch(/REQ-994/);
  });
});
