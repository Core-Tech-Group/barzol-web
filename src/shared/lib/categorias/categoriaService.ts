import { getSupabase } from '../db/client';
import type { Category } from '../../types';
import { mapCategoryRowsToCategories, type CategoryRow } from './categoriaMapper';

// ÚNICA fuente de categorías del proyecto (ver ARCHITECTURE.md § Regla de
// datos mock). landing/shared/Header.astro y todas las vistas de admin deben
// leer de aquí — ninguna debe definir su propio arreglo de categorías. La
// navegación pública /catalogo/[slug] usa exactamente estas categorías
// (instrumentos), las mismas que se administran en /admin/categorias — no
// una taxonomía alternativa.

async function fetchCategoryRows(): Promise<CategoryRow[]> {
  const { data, error } = await getSupabase()
    .from('category')
    .select('id, parent_category_id, code, name, sort_order, is_active')
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: String(r.id),
    parent_category_id: r.parent_category_id === null ? null : String(r.parent_category_id),
    code: r.code,
    name: r.name,
    sort_order: r.sort_order,
    is_active: r.is_active,
  }));
}

// Exportado para que productoService.ts pueda derivar Product.categoriaId
// (instrumento) a partir de la subcategoría hoja guardada en product.category_id.
export async function getCategoryRowsForProductMapper(): Promise<CategoryRow[]> {
  return fetchCategoryRows();
}

export async function getCategorias(): Promise<Category[]> {
  return mapCategoryRowsToCategories(await fetchCategoryRows());
}

export async function getCategoriaById(id: string): Promise<Category | null> {
  const categorias = await getCategorias();
  return categorias.find((c) => c.id === id) ?? null;
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
