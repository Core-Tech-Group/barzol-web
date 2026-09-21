import { describe, expect, it } from 'vitest';
import { ordenProductosSchema } from '../../../src/shared/lib/validation/productoSchema';

describe('SPEC-004 · validación del endpoint', () => {
  it('[TEST-074/075] REQ-411 rechaza listas vacías, duplicados y valores fuera de rango', () => {
    const invalidos = [
      { cambios: [] },
      { cambios: [{ id: '1', orden: 0 }, { id: '1', orden: 1 }] },
      { cambios: [{ id: '1', orden: 0 }, { id: '2', orden: 0 }] },
      { cambios: [{ id: '1', orden: -1 }] },
      { cambios: [{ id: '1', orden: 1.5 }] },
    ];
    for (const input of invalidos) expect(ordenProductosSchema.safeParse(input).success).toBe(false);
    expect(ordenProductosSchema.safeParse({ cambios: [{ id: '1', orden: 0 }] }).success).toBe(true);
  });
});
