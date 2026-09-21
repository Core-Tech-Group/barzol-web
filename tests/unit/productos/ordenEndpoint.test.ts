import { describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
import { patchOrden } from '../../../src/pages/api/productos/orden';

vi.mock('@shared/lib/categorias/categoriaService', () => ({ getCategorias: async () => [] }));

function context(cambios: unknown, rpc?: (name: string, args: unknown) => Promise<{ error: { code: string; message: string } | null }>) {
  return {
    request: new Request('https://barzol3d.com/api/productos/orden', { method: 'PATCH', body: JSON.stringify({ cambios }) }),
    locals: rpc ? { supabase: { rpc } } : {},
  } as unknown as APIContext;
}

describe('SPEC-004 · PATCH orden', () => {
  it('[TEST-W060/W063] REQ-410 escribe solo orden en una llamada RPC', async () => {
    const llamadas: unknown[] = [];
    const respuesta = await patchOrden(context([{ id: '7', orden: 0 }, { id: '8', orden: 1 }], async (name, args) => {
      llamadas.push({ name, args });
      return { error: null };
    }));
    expect(respuesta.status).toBe(200);
    expect(llamadas).toEqual([{ name: 'reordenar_productos', args: { cambios: [{ id: 7, orden: 0 }, { id: 8, orden: 1 }] } }]);
  });

  it('[TEST-W061/W062] REQ-411 rechaza ausencia de sesión y entrada inválida antes de escribir', async () => {
    expect((await patchOrden(context([{ id: '1', orden: 0 }]))).status).toBe(401);
    let llamadas = 0;
    const respuesta = await patchOrden(context([{ id: '1', orden: 0 }, { id: '1', orden: 1 }], async () => {
      llamadas++;
      return { error: null };
    }));
    expect(respuesta.status).toBe(400);
    expect(llamadas).toBe(0);
  });

  it('[TEST-090] REQ-418 explica la función SQL ausente', async () => {
    const respuesta = await patchOrden(context([{ id: '1', orden: 0 }], async () => ({ error: { code: 'PGRST202', message: 'missing' } })));
    expect(respuesta.status).toBe(503);
    expect((await respuesta.json() as { message: string }).message).toContain('pendiente-orden-productos.sql');
  });
});
