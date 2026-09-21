import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { calificacionWriteSchema } from '@shared/lib/validation/calificacionSchema';
import { mapProductoRowToProduct, type ProductoRow } from '@shared/lib/productos/productoMapper';
import { patchCalificacion } from '../../../src/pages/api/productos/[id]/calificacion';
import { guardarCalificacion, CalificacionError } from '@shared/lib/productos/calificacionService';

describe('SPEC-007 calificación administrable', () => {
  it('[TEST-701] REQ-701 acepta el estado sin valoraciones', () => {
    // Arrange
    const entrada = { promedio: 0, cantidad: 0 };
    // Act
    const resultado = calificacionWriteSchema.safeParse(entrada);
    // Assert
    expect(resultado.success).toBe(true);
  });

  it('[TEST-701] REQ-701 hace visible el estado vacío en tarjetas y ficha', () => {
    const rating = readFileSync('src/landing/producto/Calificacion.astro', 'utf8');
    const card = readFileSync('src/landing/producto/ProductCard.astro', 'utf8');
    const detail = readFileSync('src/landing/producto/ProductoView.astro', 'utf8');

    expect(rating).toContain('Sin calificaciones');
    expect(card).not.toContain('ratingCount > 0 &&');
    expect(detail).not.toContain('producto.ratingCount > 0 &&');
  });

  it.each([
    { promedio: 5.1, cantidad: 1 },
    { promedio: 4.99, cantidad: 2 },
    { promedio: 0, cantidad: 2 },
    { promedio: 4, cantidad: -1 },
    { promedio: 4, cantidad: 1.5 },
    { promedio: 4, cantidad: 0 },
  ])('[TEST-702] REQ-702 rechaza combinación inválida %j', (entrada) => {
    // Arrange
    const payload = entrada;
    // Act
    const resultado = calificacionWriteSchema.safeParse(payload);
    // Assert
    expect(resultado.success).toBe(false);
  });

  it('[TEST-706] REQ-706 mapea filas anteriores a la migración sin romper catálogo', () => {
    // Arrange
    const row: ProductoRow = {
      id: '1', code: 5000, name: 'Soporte', description: null, keywords: null,
      price: 100, original_price: null, category_id: '1', vendor_id: '1',
      status: 'published', is_active: true, is_personalizable: false,
      created_at: '2026-09-20T00:00:00Z', product_photo: [], product_feature: [],
    };
    // Act
    const product = mapProductoRowToProduct(row, []);
    // Assert
    expect([product.ratingAvg, product.ratingCount]).toEqual([0, 0]);
  });

  it('[TEST-703] REQ-703 rechaza PATCH sin sesión', async () => {
    // Arrange
    const context = {
      params: { id: '1' },
      request: new Request('https://barzol3d.com/api/productos/1/calificacion', {
        method: 'PATCH', body: JSON.stringify({ promedio: 4.5, cantidad: 2 }),
      }),
      locals: {},
    };
    // Act
    const response = await patchCalificacion(context);
    // Assert
    expect(response.status).toBe(401);
  });

  it('[TEST-704] REQ-704 actualiza únicamente los dos valores de rating', async () => {
    // Arrange
    const row = { name: 'Soporte', price: 100, rating_avg: 0, rating_count: 0 };
    const write = async (_id: number, input: { promedio: number; cantidad: number }) => {
      row.rating_avg = input.promedio;
      row.rating_count = input.cantidad;
      return true;
    };
    // Act
    await guardarCalificacion(write, 1, { promedio: 4.5, cantidad: 3 });
    // Assert
    expect(row).toEqual({ name: 'Soporte', price: 100, rating_avg: 4.5, rating_count: 3 });
  });

  it('[TEST-706] REQ-706 distingue migración pendiente de otros errores', async () => {
    // Arrange
    const write = async () => { throw { code: 'PGRST204' }; };
    // Act / Assert
    await expect(guardarCalificacion(write, 1, { promedio: 0, cantidad: 0 }))
      .rejects.toMatchObject({ code: 'MIGRACION_PENDIENTE' } satisfies Partial<CalificacionError>);
  });
});
