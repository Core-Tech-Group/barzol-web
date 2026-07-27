import type { Category } from '../../types';

// TODO: implementar acceso a datos real (Supabase/ORM). Por ahora solo
// define el contrato que consumirán las rutas de pages/api/categorias.

export async function getCategorias(): Promise<Category[]> {
  throw new Error('Not implemented');
}

export async function getCategoriaById(id: string): Promise<Category | null> {
  throw new Error('Not implemented');
}

export async function createCategoria(
  data: Omit<Category, 'id'>
): Promise<Category> {
  throw new Error('Not implemented');
}

export async function updateCategoria(
  id: string,
  data: Partial<Omit<Category, 'id'>>
): Promise<Category> {
  throw new Error('Not implemented');
}

export async function deleteCategoria(id: string): Promise<void> {
  throw new Error('Not implemented');
}
