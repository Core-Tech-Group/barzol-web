import type { Product } from '../../types';

// No existe columna `slug` en `product` — la URL se arma al vuelo con el
// nombre + `code` al final, y se resuelve buscando por `code` (ver
// getProductoByCode en productoService.ts). El texto antes del `code` es
// puramente decorativo/SEO — nunca se usa para buscar el producto.
export function productoUrl(producto: Pick<Product, 'slug' | 'codigo'>): string {
  return `/producto/${producto.slug}-${producto.codigo}`;
}

// Extrae el `code` del último segmento numérico de la URL
// (ej. "soporte-celular-trompeta-5000" -> 5000). Devuelve null si no matchea.
export function extractProductoCode(slugCode: string | undefined): number | null {
  if (!slugCode) return null;
  const match = slugCode.match(/-(\d+)$/);
  return match ? Number(match[1]) : null;
}
