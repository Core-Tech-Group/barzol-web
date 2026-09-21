import { describe, expect, it } from 'vitest';
import { guardarOrden, modoListado, moverAIndice, ordenarParaAdmin } from '../../../src/admin/productos/ordenAdmin';

const item = (id: string, orden: number) => ({ id, categoriaId: 'a', orden, createdAt: `2026-09-${id.padStart(2, '0')}T00:00:00Z` });

describe('SPEC-004 · orden en el panel', () => {
  it('[TEST-082/083] REQ-405 REQ-406 solo reordena al filtrar por categoría sin búsqueda', () => {
    expect(modoListado(null, '')).toBe('recientes');
    expect(modoListado('Trombón', '')).toBe('reordenar');
    expect(modoListado('Trombón', 'sor')).toBe('recientes');
    const datos = [item('1', 1), item('2', 0)];
    expect(ordenarParaAdmin(datos, 'reordenar').items.map((p) => p.id)).toEqual(['2', '1']);
    expect(ordenarParaAdmin(datos, 'reordenar').paginar).toBe(false);
    expect(ordenarParaAdmin(datos, 'recientes').items.map((p) => p.id)).toEqual(['2', '1']);
    expect(ordenarParaAdmin(datos, 'recientes').paginar).toBe(true);
  });

  it('[TEST-089] REQ-417 mueve por índice visible 1..N', () => {
    expect(moverAIndice(['a', 'b', 'c'], 2, 1)).toEqual(['c', 'a', 'b']);
    expect(moverAIndice(['a', 'b', 'c'], 0, 3)).toEqual(['b', 'c', 'a']);
  });

  it('[TEST-085/086/090] REQ-408 REQ-409 REQ-418 envía delta y explica migración ausente', async () => {
    const recibidas: { url: string; init: RequestInit }[] = [];
    const enviar = async (url: string, init: RequestInit) => {
      recibidas.push({ url, init });
      return new Response(JSON.stringify({ success: false, message: 'Falta aplicar la migración de orden de productos.' }), { status: 503 });
    };
    await expect(guardarOrden([{ id: '7', orden: 0 }], enviar)).rejects.toThrow('Falta aplicar la migración');
    expect(recibidas).toEqual([{ url: '/api/productos/orden', init: {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cambios: [{ id: '7', orden: 0 }] }),
    } }]);
  });
});
