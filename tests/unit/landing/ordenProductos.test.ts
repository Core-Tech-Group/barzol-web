import { describe, expect, it } from 'vitest';
import { hrefParaOrden, ORDEN_OPCIONES, ORDEN_POR_DEFECTO, ordenarProductos, parseOrden } from '../../../src/landing/shared/ordenProductos';

const item = (id: string, categoriaId: string, orden: number, precio: number) =>
  ({ id, categoriaId, orden, precio, createdAt: `2026-09-${id.padStart(2, '0')}T00:00:00Z` });

describe('SPEC-004 · orden público', () => {
  it('[TEST-076/077] REQ-412 REQ-416 ofrece recomendados por defecto y conserva opciones previas', () => {
    expect(ORDEN_OPCIONES.map((opcion) => opcion.valor)).toEqual(['recomendados', 'nuevos', 'precio-asc', 'precio-desc']);
    expect(ORDEN_POR_DEFECTO).toBe('recomendados');
    expect(parseOrden(null)).toBe('recomendados');
    expect(parseOrden('xyz')).toBe('recomendados');
    expect(parseOrden('nuevos')).toBe('nuevos');
  });

  it('[TEST-078] REQ-412 omite orden por defecto y reinicia paginación', () => {
    const params = new URLSearchParams('q=sordina&page=3&orden=nuevos');
    expect(hrefParaOrden('/busqueda', params, 'recomendados')).toBe('/busqueda?q=sordina');
    expect(hrefParaOrden('/busqueda', params, 'precio-asc')).toBe('/busqueda?q=sordina&orden=precio-asc');
  });

  it('[TEST-079/080/081] REQ-413/414 ordena por categoría y producto sin mutar', () => {
    const datos = [item('1', 'a', 2, 1), item('2', 'b', 1, 3), item('3', 'a', 0, 2), item('4', 'b', 0, 4)];
    const ordenados = ordenarProductos(Object.freeze(datos), 'recomendados', new Map([['a', 0], ['b', 1]]));
    expect(ordenados.map((p) => p.id)).toEqual(['3', '1', '4', '2']);
    expect(datos.map((p) => p.id)).toEqual(['1', '2', '3', '4']);
    expect(ordenarProductos(datos.filter((p) => p.categoriaId === 'a'), 'recomendados', new Map()).map((p) => p.id)).toEqual(['3', '1']);
  });

  it('[TEST-090] REQ-418 conserva más recientes antes de aplicar la migración', () => {
    const datos = [item('1', 'a', 0, 1), item('2', 'b', 0, 2)].map((p) => ({ ...p, ordenDisponible: false }));
    expect(ordenarProductos(datos, 'recomendados', new Map([['a', 0], ['b', 1]])).map((p) => p.id)).toEqual(['2', '1']);
  });
});
