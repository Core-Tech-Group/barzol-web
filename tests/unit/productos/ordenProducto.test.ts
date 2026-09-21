import { describe, expect, it } from 'vitest';
import { cambiosDeOrden, compararPorOrden, compararRecomendado, ordenAlGuardar, siguienteOrden } from '@shared/lib/productos/ordenProducto';
import { mapProductoRowToProduct, type ProductoRow } from '@shared/lib/productos/productoMapper';

const producto = (id: string, categoriaId: string, orden: number, createdAt = '2026-09-20T00:00:00Z') =>
  ({ id, categoriaId, orden, createdAt });

describe('SPEC-004 · orden de productos', () => {
  it('[TEST-073] REQ-401 REQ-418 mapea orden nuevo y reconoce fila anterior a migración', () => {
    const row: ProductoRow = {
      id: '1', code: 5000, name: 'Soporte', description: null, keywords: null,
      price: 100, original_price: null, category_id: '1', vendor_id: '1',
      status: 'published', is_active: true, is_personalizable: false,
      created_at: '2026-09-20T00:00:00Z', product_photo: [], product_feature: [],
    };
    const antes = mapProductoRowToProduct(row, []);
    const despues = mapProductoRowToProduct({ ...row, sort_order: 7 }, []);
    expect([antes.orden, antes.ordenDisponible]).toEqual([0, false]);
    expect([despues.orden, despues.ordenDisponible]).toEqual([7, true]);
  });
  it('[TEST-060/061/062] REQ-402 ubica un alta después del máximo', () => {
    expect(siguienteOrden([])).toBe(0);
    expect(siguienteOrden([0, 5, 2])).toBe(6);
    expect(ordenAlGuardar({ instrumentoAnterior: null, instrumentoNuevo: 'a', ordenActual: null, ordenesDelInstrumentoNuevo: [0, 1] })).toBe(2);
  });

  it('[TEST-063/064] REQ-403 conserva orden o envía al final al cambiar de instrumento', () => {
    expect(ordenAlGuardar({ instrumentoAnterior: 'a', instrumentoNuevo: 'a', ordenActual: 4, ordenesDelInstrumentoNuevo: [0, 3] })).toBe(4);
    expect(ordenAlGuardar({ instrumentoAnterior: 'a', instrumentoNuevo: 'b', ordenActual: 4, ordenesDelInstrumentoNuevo: [0, 3] })).toBe(4);
  });

  it('[TEST-065/066/067] REQ-401 REQ-404 REQ-413 desempata de forma determinista', () => {
    const base = [producto('7', 'a', 1), producto('9', 'a', 1), producto('2', 'a', 0), producto('3', 'a', 1, '2026-09-21T00:00:00Z')];
    const esperado = ['2', '3', '9', '7'];
    expect([...base].sort(compararPorOrden).map((p) => p.id)).toEqual(esperado);
    expect([...base].reverse().sort(compararPorOrden).map((p) => p.id)).toEqual(esperado);
  });

  it('[TEST-068/069] REQ-414 ordena instrumento antes que producto y deja desconocidos al final', () => {
    const mapa = new Map([['a', 1], ['b', 0]]);
    const lista = [producto('1', 'a', 0), producto('2', 'b', 1), producto('3', 'b', 0), producto('4', 'x', 0)];
    expect(lista.sort(compararRecomendado(mapa)).map((p) => p.id)).toEqual(['3', '2', '1', '4']);
  });

  it('[TEST-070/071/072] REQ-408 envía solo posiciones cambiadas y cierra huecos', () => {
    expect(cambiosDeOrden([producto('1', 'a', 0), producto('2', 'a', 1)])).toEqual([]);
    expect(cambiosDeOrden([producto('2', 'a', 1), producto('1', 'a', 0), producto('3', 'a', 2)]))
      .toEqual([{ id: '2', orden: 0 }, { id: '1', orden: 1 }]);
    expect(cambiosDeOrden([producto('1', 'a', 0), producto('2', 'a', 2), producto('3', 'a', 5)]))
      .toEqual([{ id: '2', orden: 1 }, { id: '3', orden: 2 }]);
  });
});
