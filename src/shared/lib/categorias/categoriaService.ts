import { getSupabase } from '../db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from '../../types';
import { mapCategoryRowsToCategories, type CategoryRow } from './categoriaMapper';

// ÚNICA fuente de categorías del proyecto (ver ARCHITECTURE.md § Regla de
// datos mock). landing/shared/Header.astro y todas las vistas de admin deben
// leer de aquí — ninguna debe definir su propio arreglo de categorías. La
// navegación pública /catalogo/[slug] usa exactamente estas categorías
// (instrumentos), las mismas que se administran en /admin/categorias — no
// una taxonomía alternativa.

// Header (en cada página) y las vistas que listan productos (getProductos)
// piden las mismas filas de `category` por separado — sin esta caché corta,
// una sola navegación dispara la misma query dos veces contra Supabase.
let categoryRowsCache: { rows: CategoryRow[]; expiresAt: number } | null = null;
const CATEGORY_ROWS_CACHE_TTL_MS = 60_000;

async function fetchCategoryRows(): Promise<CategoryRow[]> {
  if (categoryRowsCache && categoryRowsCache.expiresAt > Date.now()) {
    return categoryRowsCache.rows;
  }
  const { data, error } = await getSupabase()
    .from('category')
    .select('id, parent_category_id, code, name, sort_order, is_active')
    .order('sort_order');
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({
    id: String(r.id),
    parent_category_id: r.parent_category_id === null ? null : String(r.parent_category_id),
    code: r.code,
    name: r.name,
    sort_order: r.sort_order,
    is_active: r.is_active,
  }));
  categoryRowsCache = { rows, expiresAt: Date.now() + CATEGORY_ROWS_CACHE_TTL_MS };
  return rows;
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

// Escritura: category y subcategory son la MISMA tabla (autorreferenciada) —
// una subcategoría es, para efectos de escritura, una fila de `category` con
// parentId apuntando a otra. `code` no se manda: lo asigna la secuencia
// `category_code_seq` (DEFAULT de la columna, ver supabase/schema.sql).
//
// Requiere el cliente autenticado (no el `supabase` anónimo de arriba) — las
// policies de RLS de escritura exigen `auth.uid()` en `admin_profile`. Lo
// arma cada endpoint de /api/categorias/** a partir de la cookie de sesión.
export interface CategoriaWriteInput {
  nombre: string;
  parentId: string | null;
  orden: number;
}

export async function createCategoria(
  supabaseAuth: SupabaseClient,
  input: CategoriaWriteInput
): Promise<{ id: string }> {
  const { data, error } = await supabaseAuth
    .from('category')
    .insert({
      name: input.nombre,
      parent_category_id: input.parentId ? Number(input.parentId) : null,
      sort_order: input.orden,
    })
    .select('id')
    .single();
  if (error) throw error;
  categoryRowsCache = null;
  return { id: String(data.id) };
}

export async function updateCategoria(
  supabaseAuth: SupabaseClient,
  id: string,
  input: CategoriaWriteInput
): Promise<{ id: string }> {
  const { error } = await supabaseAuth
    .from('category')
    .update({
      name: input.nombre,
      parent_category_id: input.parentId ? Number(input.parentId) : null,
      sort_order: input.orden,
    })
    .eq('id', Number(id));
  if (error) throw error;
  categoryRowsCache = null;
  return { id };
}

export async function deleteCategoria(supabaseAuth: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabaseAuth.from('category').delete().eq('id', Number(id));
  if (error) {
    if (error.code === '23503') {
      throw new Error('No se puede eliminar: hay productos asignados a esta categoría (o a alguna de sus subcategorías).');
    }
    throw error;
  }
  categoryRowsCache = null;
}
