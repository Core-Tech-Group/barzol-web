// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CategoriesAdmin from '../../../src/admin/categorias/CategoriesAdmin';
import InicioAdmin from '../../../src/admin/inicio/InicioAdmin';
import ProductsAdmin from '../../../src/admin/productos/ProductsAdmin';
import ProductRatingEditor from '../../../src/admin/productos/ProductRatingEditor';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('Editores administrativos · interacciones principales', () => {
  it('[TEST-801] REQ-801 abre y cierra el formulario de producto', () => {
    render(createElement(ProductsAdmin, {
      initialProducts: [], categories: ['Todos', 'Trombón'],
      instrumentsByCategory: { Trombón: [] }, vendors: ['Barzol'],
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo producto' }));
    expect(screen.getByText('Guardar cambios')).toBeTruthy();
    expect(screen.getByText('Guarda primero el producto nuevo para poder asignarle una calificación.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Guardar calificación' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByText('El nombre es obligatorio')).toBeTruthy();
    expect(screen.getByText('El precio es obligatorio')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Guardar cambios')).toBeNull();
  });

  it('[TEST-708] REQ-708 muestra la edición de calificación dentro del producto', () => {
    render(createElement(ProductsAdmin, {
      initialProducts: [{
        id: '1', orden: 0, createdAt: '2026-09-20T00:00:00Z', name: 'Soporte de trombón', category: 'Trombón', instrument: '',
        vendor: 'Barzol', price: '95.00', originalPrice: '', description: '',
        keywords: '', features: [], photos: [null, null, null, null, null],
        statusLabel: 'Publicado', active: true, customizable: false,
        ratingAvg: 0, ratingCount: 0,
      }],
      categories: ['Todos', 'Trombón'], instrumentsByCategory: { Trombón: [] }, vendors: ['Barzol'],
    }));

    fireEvent.click(screen.getByTitle('Editar'));
    expect(screen.getByText('Calificación del producto')).toBeTruthy();
    expect(screen.getByLabelText('Promedio (0–5)')).toBeTruthy();
    expect(screen.getByLabelText('Cantidad de calificaciones')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar calificación' })).toBeTruthy();
  });

  it('[TEST-708] REQ-708 guarda solo las dos columnas por el endpoint dedicado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: null }) });
    const onSaved = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(createElement(ProductRatingEditor, {
      producto: { id: '7', orden: 0, createdAt: '2026-09-20T00:00:00Z', name: 'Soporte', category: 'Trombón', instrument: '',
        vendor: 'Barzol', price: '95.00', originalPrice: '', description: '',
        keywords: '', features: [], photos: [], statusLabel: 'Publicado',
        active: true, customizable: false, ratingAvg: 0, ratingCount: 0 },
      onSaved,
    }));

    fireEvent.change(screen.getByLabelText('Promedio (0–5)'), { target: { value: '4.5' } });
    fireEvent.change(screen.getByLabelText('Cantidad de calificaciones'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar calificación' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(4.5, 3));
    expect(fetchMock).toHaveBeenCalledWith('/api/productos/7/calificacion', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promedio: 4.5, cantidad: 3 }),
    });
    expect(screen.getByRole('status').textContent).toContain('Calificación guardada');
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
