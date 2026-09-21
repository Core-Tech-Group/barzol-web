import { describe, expect, it } from 'vitest';
import { buildSitemapXml, canonicalUrl, collectProductPaths, SITEMAP_BATCH_SIZE } from '@shared/lib/seo/sitemap';
import { GET as getRobots } from '../../../src/pages/robots.txt';

describe('SPEC-006 SEO Esencial', () => {
  it('[TEST-601] REQ-601 fija dominio y elimina parámetros de rastreo', () => {
    // Arrange
    const path = '/producto/soporte-5000?utm_source=whatsapp';
    // Act
    const url = canonicalUrl(path);
    // Assert
    expect(url).toBe('https://barzol3d.com/producto/soporte-5000');
  });

  it('[TEST-603] REQ-603 genera XML absoluto y escapa caracteres', () => {
    // Arrange
    const paths = ['/', '/catalogo/trompetas-y-cornetas', '/producto/a&b-5000'];
    // Act
    const xml = buildSitemapXml(paths);
    // Assert
    expect(xml).toContain('<loc>https://barzol3d.com/producto/a&amp;b-5000</loc>');
    expect(xml.match(/<loc>/g)).toHaveLength(3);
  });

  it('[TEST-604] REQ-604 elimina URLs repetidas', () => {
    // Arrange
    const paths = ['/', '/catalogo', '/catalogo'];
    // Act
    const xml = buildSitemapXml(paths);
    // Assert
    expect(xml.match(/<loc>/g)).toHaveLength(2);
  });

  it('[TEST-604] REQ-604 recorre más de un lote sin omitir productos', async () => {
    // Arrange
    const rows = Array.from({ length: SITEMAP_BATCH_SIZE + 2 }, (_, index) => ({ code: 5000 + index, name: `Producto ${index}` }));
    const ranges: number[] = [];
    // Act
    const paths = await collectProductPaths(async (offset, limit) => {
      ranges.push(offset);
      return rows.slice(offset, offset + limit);
    });
    // Assert
    expect(ranges).toEqual([0, SITEMAP_BATCH_SIZE]);
    expect(paths).toHaveLength(SITEMAP_BATCH_SIZE + 2);
    expect(paths.at(-1)).toBe('/producto/producto-501-5501');
  });

  it('[TEST-605] REQ-605 propaga fallo de lectura sin entregar XML parcial', async () => {
    // Arrange
    const read = async () => { throw new Error('Postgres no disponible'); };
    // Act / Assert
    await expect(collectProductPaths(read)).rejects.toThrow('Postgres no disponible');
  });

  it('[TEST-606] REQ-606 robots anuncia el sitemap y excluye rutas internas', async () => {
    // Act
    const response = await getRobots({} as Parameters<typeof getRobots>[0]);
    const content = await response.text();
    // Assert
    expect(content).toContain('Sitemap: https://barzol3d.com/sitemap.xml');
    expect(content).toContain('Disallow: /admin/');
    expect(content).toContain('Disallow: /api/');
    expect(content).toContain('Allow: /admin/login');
    expect(content).not.toContain('Disallow: /busqueda');
  });
});
