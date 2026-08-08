import { getSupabase } from '../db/client';
import type { Product, Vendor } from '../../types';
import { mapProductoRowToProduct, type ProductoRow } from './productoMapper';
import { getCategoryRowsForProductMapper } from '../categorias/categoriaService';

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
    getSupabase().from('product').select(PRODUCT_SELECT),
    getCategoryRowsForProductMapper(),
  ]);
  if (error) throw error;
  return (data ?? []).map((r) => mapProductoRowToProduct(toProductoRow(r), categoryRows));
}

export async function getProductoById(id: string): Promise<Product | null> {
  const [{ data, error }, categoryRows] = await Promise.all([
    getSupabase().from('product').select(PRODUCT_SELECT).eq('id', Number(id)).maybeSingle(),
    getCategoryRowsForProductMapper(),
  ]);
  if (error) throw error;
  return data ? mapProductoRowToProduct(toProductoRow(data), categoryRows) : null;
}

export async function getVendors(): Promise<Vendor[]> {
  const { data, error } = await getSupabase().from('vendor').select('id, name').order('name');
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: String(r.id), nombre: r.name }));
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
