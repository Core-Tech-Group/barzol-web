import type { GalleryItem } from '../../types';

// ÚNICA fuente de la galería del proyecto — sirve a las dos galerías del
// sitio (Accesorios personalizados y Trabajos de ingeniería), distinguidas
// por `tipo`.
//
// TODO: reemplazar el arreglo mock por una consulta real (Supabase/Drizzle o
// Prisma) cuando esté listo el ORM. La firma de cada función no cambia, así
// que ningún consumidor (vistas, endpoint de pages/api/galeria) se toca.
// Ver galeriaMapper.ts: ya documenta la forma de la fila cruda de
// `gallery_item` y la función que la convierte a `GalleryItem`.
const galeria: GalleryItem[] = [
  { id: 'gal-acc-1', tipo: 'accesorios', imagenUrl: null, titulo: 'Soporte grabado con nombre', orden: 0 },
  { id: 'gal-acc-2', tipo: 'accesorios', imagenUrl: null, titulo: 'BERP personalizado en trombón', orden: 1 },
  { id: 'gal-acc-3', tipo: 'accesorios', imagenUrl: null, titulo: 'Sordina con logo de banda', orden: 2 },
  { id: 'gal-ing-1', tipo: 'trabajos', imagenUrl: null, titulo: 'Escaneo 3D de pieza original', orden: 0 },
  { id: 'gal-ing-2', tipo: 'trabajos', imagenUrl: null, titulo: 'Diseño CAD/CAE de repuesto', orden: 1 },
  { id: 'gal-ing-3', tipo: 'trabajos', imagenUrl: null, titulo: 'Pieza reconstruida por ingeniería inversa', orden: 2 },
];

export async function getGaleria(tipo?: GalleryItem['tipo']): Promise<GalleryItem[]> {
  return tipo ? galeria.filter((g) => g.tipo === tipo) : galeria;
}

export async function addGaleriaItem(
  data: Omit<GalleryItem, 'id'>
): Promise<GalleryItem> {
  throw new Error('Not implemented');
}
