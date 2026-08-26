import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * SPEC-905 REQ-982, REQ-983 — la galería pública muestra la foto.
 *
 * Tests sobre el **código fuente**, no sobre su comportamiento. La rareza está
 * justificada por lo que pasó: la mitad pública de `BZ-82` no fue un `<img>`
 * roto, fue que dos vistas tiraban el dato antes de dárselo al componente:
 *
 *     .map((g) => ({ name: g.titulo }));   // y la URL se quedaba en el suelo
 *
 * Eso compila, pasa el typecheck y produce una página que se ve "bien": tres
 * cuadros grises perfectamente alineados. Ningún test de unidad lo habría
 * detectado, y la capa que lo haría —componentes, `BZ-60`— sigue bloqueada.
 * Lo que sí se puede fijar hoy es que el campo no vuelva a desaparecer por el
 * camino, que es la regresión concreta que hubo.
 *
 * Cuando `BZ-74` (E2E) exista, estos tests se sustituyen por uno que abra
 * `/servicios` y compruebe que hay un `<img>` con `src` de R2. Hasta entonces,
 * esto es lo más cerca que se llega sin fingir cobertura.
 */

const lightbox = readFileSync('src/landing/servicios/GalleryLightbox.tsx', 'utf8');
const vistas = {
  'ServiciosView.astro': readFileSync('src/landing/servicios/ServiciosView.astro', 'utf8'),
  'IngenieriaView.astro': readFileSync('src/landing/servicios/IngenieriaView.astro', 'utf8'),
};

describe('SPEC-905 · GalleryLightbox · renderiza la imagen (REQ-982)', () => {
  it('[TEST-528] el item lleva `imagenUrl`', () => {
    // Assert — el campo no existía; el componente pintaba el marcador siempre.
    expect(lightbox).toMatch(/imagenUrl\??:\s*string/);
  });

  it('[TEST-528] hay un `<img>` cuyo `src` sale de `imagenUrl`', () => {
    // Assert
    expect(lightbox).toMatch(/<img[\s\S]{0,200}src=\{[^}]*imagenUrl/);
  });

  it('[TEST-528] la imagen se muestra también en el lightbox, no solo en la rejilla', () => {
    // Dos elementos JSX: uno en la rejilla, otro en la vista ampliada. Se
    // cuentan solo los que abren línea, porque este archivo menciona `<img>`
    // dentro de un comentario y contar apariciones a secas daba tres.
    // Assert
    expect(lightbox.match(/^\s+<img\b/gm) ?? []).toHaveLength(2);
  });
});

describe('SPEC-905 · GalleryLightbox · degrada sin romper (REQ-983)', () => {
  it('[TEST-529] una URL que no carga cae al marcador de posición', () => {
    // Una URL puede ser válida y devolver 404 igualmente — es lo que `BZ-76`
    // documenta para dos imágenes de producto.
    // Assert
    expect(lightbox).toMatch(/onError=/);
    expect(lightbox).toMatch(/PhotoIcon/);
  });

  it('[TEST-529] decide con `estadoImagen`, no con una comprobación propia', () => {
    // Regla 9.2: la respuesta a "¿esta imagen sirve?" vive en un solo sitio, y
    // la comparten el esquema del endpoint, el panel y esta vista.
    // Assert
    expect(lightbox).toMatch(/import \{ estadoImagen \} from '@shared\/lib\/galeria\/imagenGaleria'/);
  });
});

describe('SPEC-905 · las vistas no tiran la URL por el camino (REQ-982)', () => {
  it.each(Object.entries(vistas))('[TEST-528] %s pasa `imagenUrl` al componente', (_nombre, fuente) => {
    // Assert — ésta es, literalmente, la línea que causó la mitad del bug.
    expect(fuente).toMatch(/imagenUrl:\s*g\.imagenUrl/);
  });

  it.each(Object.entries(vistas))('[TEST-528] %s no vuelve a mapear solo el título', (_nombre, fuente) => {
    // Assert
    expect(fuente).not.toMatch(/\(\{\s*name:\s*g\.titulo\s*\}\)/);
  });
});
