import { describe, expect, it } from 'vitest';
import { resumirCalificaciones } from '@shared/lib/productos/calificacionGlobal';

describe('SPEC-012 resumen global de calificaciones', () => {
  it('[TEST-1201] REQ-1201 pondera por cantidad y no por producto', async () => {
    // Arrange
    const leer = async () => [
      { id: 1, promedio: 5, cantidad: 1 },
      { id: 2, promedio: 3, cantidad: 9 },
    ];
    // Act
    const resumen = await resumirCalificaciones(leer);
    // Assert
    expect(resumen).toEqual({ promedio: 3.2, cantidad: 10 });
  });

  it('[TEST-1202] REQ-1202 recorre todas las páginas y suma un producto nuevo', async () => {
    // Arrange
    const productos = [
      { id: 1, promedio: 4, cantidad: 3 },
      { id: 2, promedio: 5, cantidad: 2 },
      { id: 3, promedio: 2, cantidad: 5 },
    ];
    const leer = async (afterId: number, limit: number) => productos.filter((p) => p.id > afterId).slice(0, limit);
    // Act
    const resumen = await resumirCalificaciones(leer, 2);
    // Assert
    expect(resumen).toEqual({ promedio: 3.2, cantidad: 10 });
  });

  it('[TEST-1203] REQ-1203 mantiene estado vacío sin dividir entre cero', async () => {
    // Arrange
    const leer = async () => [];
    // Act
    const resumen = await resumirCalificaciones(leer);
    // Assert
    expect(resumen).toEqual({ promedio: 0, cantidad: 0 });
  });
});
