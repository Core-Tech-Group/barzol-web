// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CategoriesAdmin from '../../../src/admin/categorias/CategoriesAdmin';
import InicioAdmin from '../../../src/admin/inicio/InicioAdmin';
import ProductsAdmin from '../../../src/admin/productos/ProductsAdmin';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Editores administrativos · interacciones principales', () => {
  it('[TEST-801] REQ-801 abre y cierra el formulario de producto', () => {
    render(createElement(ProductsAdmin, {
      initialProducts: [], categories: ['Todos', 'Trombón'],
      instrumentsByCategory: { Trombón: [] }, vendors: ['Barzol'],
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));
    expect(screen.getByText('Guardar cambios')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('El nombre es obligatorio')).toBeTruthy();
    expect(screen.getByText('El precio es obligatorio')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Guardar cambios')).toBeNull();
  });

  it('[TEST-802] REQ-802 añade una sección y avisa de cambios sin guardar', () => {
    render(createElement(InicioAdmin, {
      initialItems: [{ id: 's1', type: 'section', title: 'Destacados',
        visible: true, open: true, products: [] }],
      allProducts: [], initialHeroImages: [null, null, null],
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo listado' }));
    const title = screen.getByPlaceholderText('Título de la sección');
    fireEvent.change(title, { target: { value: 'Ofertas' } });
    fireEvent.blur(title);
    expect(screen.getByText('2 secciones')).toBeTruthy();
    expect(screen.getByText('Cambios sin guardar')).toBeTruthy();
  });

  it('[TEST-803] REQ-803 añade una categoría y avisa de cambios sin guardar', () => {
    render(createElement(CategoriesAdmin, { initialCategories: [
      { id: '1', name: 'Trombón', subs: [] },
    ] }));

    fireEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    const name = screen.getByPlaceholderText('Nombre de la categoría');
    fireEvent.change(name, { target: { value: 'Saxofón' } });
    fireEvent.blur(name);
    expect(screen.getByText('2 categorías')).toBeTruthy();
    expect(screen.getByText('Cambios sin guardar')).toBeTruthy();
  });
});
