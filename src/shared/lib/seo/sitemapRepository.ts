import { getSupabase } from '../db/client';
import { getCategorias } from '../categorias/categoriaService';
import { collectProductPaths, MAX_SITEMAP_URLS } from './sitemap';

const PUBLIC_PATHS = [
  '/', '/catalogo', '/galeria', '/nosotros',
  '/servicios/accesorios-personalizados',
  '/servicios/escaneo-impresion-3d',
  '/servicios/trabajos-de-ingenieria-avanzada',
];

// Adaptador de I/O de SPEC-006. La consulta selecciona solo campos de URL y
// pagina explícitamente: PostgREST suele limitar el número de filas por request.
export async function getSitemapPaths(): Promise<string[]> {
  const categories = await getCategorias();
  const paths = [...PUBLIC_PATHS, ...categories.map((category) => `/catalogo/${category.slug}`)];
  const productPaths = await collectProductPaths(async (offset, limit) => {
    const { data, error } = await getSupabase()
      .from('product')
      .select('code, name')
      .eq('status', 'published')
      .eq('is_active', true)
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data ?? [];
  });
  paths.push(...productPaths);
  if (paths.length > MAX_SITEMAP_URLS) throw new Error('Sitemap supera el máximo de URLs permitido.');
  return paths;
}
