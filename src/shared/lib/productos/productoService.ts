import { supabase } from '../db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product, Vendor } from '../../types';
import { mapProductoRowToProduct, type ProductoRow } from './productoMapper';
import { getCategorias, getCategoryRowsForProductMapper } from '../categorias/categoriaService';

// ÚNICA fuente de productos del proyecto (ver ARCHITECTURE.md § Regla de
// datos mock). Ninguna vista debe definir su propio arreglo de productos.

const PRODUCT_SELECT = '*, product_photo(url, sort_order), product_feature(content, sort_order)';

function toProductoRow(r: any): ProductoRow {
  return {
    id: String(r.id),
    code: r.code,
    name: r.name,
    description: r.description,
    keywords: r.keywords,
    price: Number(r.price),
    original_price: r.original_price === null ? null : Number(r.original_price),
    category_id: String(r.category_id),
    vendor_id: String(r.vendor_id),
    status: r.status,
    is_active: r.is_active,
    is_personalizable: r.is_personalizable,
    created_at: r.created_at,
    product_photo: r.product_photo ?? [],
    product_feature: r.product_feature ?? [],
  };
}

export async function getProductos(): Promise<Product[]> {
  const [{ data, error }, categoryRows] = await Promise.all([
    supabase.from('product').select(PRODUCT_SELECT),
    getCategoryRowsForProductMapper(),
  ]);
  if (error) throw error;
  return (data ?? []).map((r) => mapProductoRowToProduct(toProductoRow(r), categoryRows));
}

export async function getProductoById(id: string): Promise<Product | null> {
  const [{ data, error }, categoryRows] = await Promise.all([
    supabase.from('product').select(PRODUCT_SELECT).eq('id', Number(id)).maybeSingle(),
    getCategoryRowsForProductMapper(),
  ]);
  if (error) throw error;
  return data ? mapProductoRowToProduct(toProductoRow(data), categoryRows) : null;
}

// No existe columna `slug` en `product` — la URL pública resuelve el
// producto por `code` (ver productoUrl.ts). Esta es la función que hace esa
// búsqueda real.
export async function getProductoByCode(code: number): Promise<Product | null> {
  const [{ data, error }, categoryRows] = await Promise.all([
    supabase.from('product').select(PRODUCT_SELECT).eq('code', code).maybeSingle(),
    getCategoryRowsForProductMapper(),
  ]);
  if (error) throw error;
  return data ? mapProductoRowToProduct(toProductoRow(data), categoryRows) : null;
}

export async function getVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase.from('vendor').select('id, name').order('name');
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: String(r.id), nombre: r.name }));
}

// Escritura: el formulario de admin trabaja con NOMBRES (categoría/instrumento,
// vendor), no con ids — ProductosView.astro ya adapta así los datos para la
// isla (ver ese archivo). Estas funciones resuelven esos nombres contra la
// tabla real antes de escribir. `code` no se manda: lo asigna la secuencia
// `product_code_seq` (DEFAULT de la columna, ver supabase/schema.sql).
//
// Requieren el cliente autenticado (no el `supabase` anónimo de arriba) — las
// policies de RLS de escritura exigen `auth.uid()` en `admin_profile`.
export interface ProductoWriteInput {
  nombre: string;
  categoriaNombre: string;
  subcategoriaNombre: string | null;
  vendorNombre: string;
  precio: number;
  precioOriginal: number | null;
  descripcion: string;
  keywords: string;
  caracteristicas: string[];
  fotos: string[];
  publicado: boolean;
  activo: boolean;
  personalizable: boolean;
}

async function resolveCategoryLeafId(categoriaNombre: string, subcategoriaNombre: string | null): Promise<number> {
  const categorias = await getCategorias();
  const categoria = categorias.find((c) => c.nombre === categoriaNombre);
  if (!categoria) throw new Error(`Categoría "${categoriaNombre}" no encontrada.`);

  if (subcategoriaNombre) {
    const sub = categoria.subcategorias.find((s) => s.nombre === subcategoriaNombre);
    if (!sub) throw new Error(`Subcategoría "${subcategoriaNombre}" no encontrada en "${categoriaNombre}".`);
    return Number(sub.id);
  }
  if (categoria.subcategorias.length > 0) {
    throw new Error(`"${categoriaNombre}" tiene subcategorías — hay que elegir una.`);
  }
  return Number(categoria.id);
}

async function resolveVendorId(supabaseAuth: SupabaseClient, vendorNombre: string): Promise<number> {
  const { data, error } = await supabaseAuth.from('vendor').select('id').eq('name', vendorNombre).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Vendor "${vendorNombre}" no encontrado.`);
  return data.id;
}

function toProductRow(input: ProductoWriteInput, categoryId: number, vendorId: number) {
  return {
    name: input.nombre,
    description: input.descripcion,
    keywords: input.keywords,
    price: input.precio,
    original_price: input.precioOriginal,
    category_id: categoryId,
    vendor_id: vendorId,
    status: input.publicado ? 'published' : 'draft',
    is_active: input.activo,
    is_personalizable: input.personalizable,
  };
}

// Reemplaza por completo las fotos/características del producto — el
// formulario de admin siempre manda la lista final, no un delta. Los 2
// DELETE van en paralelo entre sí (tablas independientes), y después los 2
// INSERT también — 2 round-trips en total en vez de 4 secuenciales.
async function replacePhotosAndFeatures(
  supabaseAuth: SupabaseClient,
  productId: number,
  fotos: string[],
  caracteristicas: string[]
) {
  const [delPhoto, delFeat] = await Promise.all([
    supabaseAuth.from('product_photo').delete().eq('product_id', productId),
    supabaseAuth.from('product_feature').delete().eq('product_id', productId),
  ]);
  if (delPhoto.error) throw delPhoto.error;
  if (delFeat.error) throw delFeat.error;

  const inserts: PromiseLike<{ error: { message: string } | null }>[] = [];
  if (fotos.length > 0) {
    inserts.push(
      supabaseAuth.from('product_photo').insert(fotos.map((url, i) => ({ product_id: productId, url, sort_order: i })))
    );
  }
  if (caracteristicas.length > 0) {
    inserts.push(
      supabaseAuth
        .from('product_feature')
        .insert(caracteristicas.map((content, i) => ({ product_id: productId, content, sort_order: i })))
    );
  }
  const results = await Promise.all(inserts);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

// createProducto/updateProducto devuelven solo el `id` — no vuelven a leer
// el producto completo (antes hacían un getProductoById final que se
// descartaba: la isla de admin recarga la página apenas la respuesta es
// exitosa, así que ese fetch de más solo agregaba latencia sin usarse).
export async function createProducto(supabaseAuth: SupabaseClient, input: ProductoWriteInput): Promise<{ id: string }> {
  const [categoryId, vendorId] = await Promise.all([
    resolveCategoryLeafId(input.categoriaNombre, input.subcategoriaNombre),
    resolveVendorId(supabaseAuth, input.vendorNombre),
  ]);

  const { data, error } = await supabaseAuth
    .from('product')
    .insert(toProductRow(input, categoryId, vendorId))
    .select('id')
    .single();
  if (error) throw error;

  await replacePhotosAndFeatures(supabaseAuth, data.id, input.fotos, input.caracteristicas);

  return { id: String(data.id) };
}

export async function updateProducto(
  supabaseAuth: SupabaseClient,
  id: string,
  input: ProductoWriteInput
): Promise<{ id: string }> {
  const [categoryId, vendorId] = await Promise.all([
    resolveCategoryLeafId(input.categoriaNombre, input.subcategoriaNombre),
    resolveVendorId(supabaseAuth, input.vendorNombre),
  ]);

  const { error } = await supabaseAuth
    .from('product')
    .update(toProductRow(input, categoryId, vendorId))
    .eq('id', Number(id));
  if (error) throw error;

  await replacePhotosAndFeatures(supabaseAuth, Number(id), input.fotos, input.caracteristicas);

  return { id };
}

export async function deleteProducto(supabaseAuth: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabaseAuth.from('product').delete().eq('id', Number(id));
  if (error) throw error;
}
