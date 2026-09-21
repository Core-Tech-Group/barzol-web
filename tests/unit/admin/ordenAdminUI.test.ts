// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import ProductsAdmin from '../../../src/admin/productos/ProductsAdmin';
import type { AdminProduct } from '../../../src/admin/productos/productsAdminModel';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const product = (id: string, name: string, orden: number): AdminProduct => ({
  id, name, orden, createdAt: `2026-09-${id.padStart(2, '0')}T00:00:00Z`,
  category: 'Trombón', instrument: '', vendor: 'Barzol', price: '20.00', originalPrice: '',
  description: '', keywords: '', features: [], photos: [null], statusLabel: 'Publicado',
  active: true, customizable: false,
});

describe('SPEC-004 · interacción del listado', () => {
  it('[TEST-083/084/089] REQ-405 REQ-407 REQ-417 muestra índice solo por categoría y guarda el movimiento', async () => {
    const enviar = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: null }) });
    vi.stubGlobal('fetch', enviar);
    render(createElement(ProductsAdmin, {
      initialProducts: [product('1', 'Primero', 0), product('2', 'Segundo', 1)],
      categories: ['Todos', 'Trombón'], instrumentsByCategory: { Trombón: [] }, vendors: ['Barzol'],
    }));

    expect(screen.queryByLabelText('Posición del producto 1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Trombón' }));
    expect(screen.getAllByText('Posición')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Posición del producto 2'), { target: { value: '1' } });
    expect(window.__adminHasUnsavedChanges).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar orden' }));
    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/api/productos/orden', expect.objectContaining({ method: 'PATCH' })));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Orden guardado'));
    expect(window.__adminHasUnsavedChanges).toBe(false);
  });

  it('[TEST-083] REQ-405 cambia el orden local al soltar una fila', () => {
    const { container } = render(createElement(ProductsAdmin, {
      initialProducts: [product('1', 'Primero', 0), product('2', 'Segundo', 1)],
      categories: ['Todos', 'Trombón'], instrumentsByCategory: { Trombón: [] }, vendors: ['Barzol'],
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Trombón' }));
    const rows = container.querySelectorAll('.admin-product-row');
    fireEvent.dragStart(rows[1], { dataTransfer: { effectAllowed: 'move' } });
    fireEvent.dragOver(rows[0]);
    fireEvent.drop(rows[0]);
    expect(container.querySelector('.admin-product-row')?.textContent).toContain('Segundo');
    expect(screen.getByRole('button', { name: 'Guardar orden' }).hasAttribute('disabled')).toBe(false);
  });
});
