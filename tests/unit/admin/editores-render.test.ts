import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import CategoriesAdmin from '../../../src/admin/categorias/CategoriesAdmin';
import InicioAdmin from '../../../src/admin/inicio/InicioAdmin';
import ProductsAdmin, { type AdminProduct } from '../../../src/admin/productos/ProductsAdmin';

// BZ-101/BZ-112: contrato observable antes de separar los editores heredados.
describe('Editores administrativos · render inicial', () => {
  it('[TEST-801] REQ-801 conserva listado y acciones del editor de productos', () => {
    // Arrange
    const products: AdminProduct[] = [{
      id: '1', name: 'Soporte de trombón', category: 'Trombón', instrument: '',
      vendor: 'Barzol', price: '95.00', originalPrice: '', description: '',
      keywords: '', features: [], photos: [null, null, null, null, null],
      statusLabel: 'Publicado', active: true, customizable: false,
    }];
    // Act
    const html = renderToStaticMarkup(createElement(ProductsAdmin, {
      initialProducts: products, categories: ['Todos', 'Trombón'],
      instrumentsByCategory: { Trombón: [] }, vendors: ['Barzol'],
    }));
    // Assert
    expect(html).toContain('Soporte de trombón');
    expect(html).toContain('Nuevo producto');
    expect(html).toContain('S/ 95.00');
    expect(html).toContain('Activo');
  });

  it('[TEST-802] REQ-802 conserva producto seleccionado en el editor del inicio', () => {
    // Arrange
    const props = {
      initialItems: [{ id: 's1', type: 'section' as const, title: 'Destacados',
        visible: true, open: true, products: ['1'] }],
      allProducts: [{ id: '1', name: 'Soporte de trombón', category: 'Trombón' }],
      initialHeroImages: [null, null, null],
    };
    // Act
    const html = renderToStaticMarkup(createElement(InicioAdmin, props));
    // Assert
    expect(html).toContain('Destacados');
    expect(html).toContain('Soporte de trombón');
    expect(html).toContain('Guardar');
  });

  it('[TEST-803] REQ-803 conserva árbol y controles de categorías', () => {
    // Arrange
    const props = { initialCategories: [{ id: '1', name: 'Trombón', subs: [{ id: '2', name: 'Sordinas' }] }] };
    // Act
    const html = renderToStaticMarkup(createElement(CategoriesAdmin, props));
    // Assert
    expect(html).toContain('Trombón');
    expect(html).toContain('Sordinas');
    expect(html).toContain('Nueva categoría');
  });

  it('[TEST-804] REQ-804 mantiene los tres editores bajo 500 líneas', () => {
    // Arrange
    const files = [
      'src/admin/productos/ProductsAdmin.tsx',
      'src/admin/inicio/InicioAdmin.tsx',
      'src/admin/categorias/CategoriesAdmin.tsx',
    ];
    // Act
    const lengths = files.map((file) => ({ file, lines: readFileSync(file, 'utf8').split('\n').length }));
    // Assert
    expect(lengths.filter(({ lines }) => lines > 500)).toEqual([]);
  });
});
