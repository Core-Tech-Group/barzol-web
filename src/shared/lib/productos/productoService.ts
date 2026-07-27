import type { Product } from '../../types';

// TODO: implementar acceso a datos real (Supabase/ORM). Por ahora solo
// define el contrato que consumirán las rutas de pages/api/productos.

export async function getProductos(): Promise<Product[]> {
  throw new Error('Not implemented');
}

export async function getProductoById(id: string): Promise<Product | null> {
  throw new Error('Not implemented');
}

export async function createProducto(
  data: Omit<Product, 'id' | 'createdAt'>
): Promise<Product> {
  throw new Error('Not implemented');
}

export async function updateProducto(
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<Product> {
  throw new Error('Not implemented');
}

export async function deleteProducto(id: string): Promise<void> {
  throw new Error('Not implemented');
}
