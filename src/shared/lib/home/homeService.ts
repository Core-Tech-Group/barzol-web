import type { HomeHeroImage, HomeItem } from '../../types';

// ÚNICA fuente de la página de inicio del proyecto: imágenes hero + la lista
// unificada y reordenable de secciones de productos y banners.
//
// TODO: reemplazar los arreglos mock por una consulta real (Supabase/Drizzle
// o Prisma) cuando esté listo el ORM. La firma de cada función no cambia,
// así que ningún consumidor (vistas de admin/landing) se toca.
const heroImages: HomeHeroImage[] = [
  { id: 'hero-1', imagenUrl: null, orden: 0 },
  { id: 'hero-2', imagenUrl: null, orden: 1 },
  { id: 'hero-3', imagenUrl: null, orden: 2 },
];

const homeItems: HomeItem[] = [
  {
    id: 'item-1',
    tipo: 'seccion',
    titulo: 'Soportes para celular',
    visible: true,
    orden: 0,
    imagenUrl: null,
    link: null,
    productoIds: [
      'prod-soporte-celular-trompeta',
      'prod-soporte-celular-clarinete',
      'prod-soporte-celular-euphonium-frontal',
      'prod-soporte-celular-trombon-tudel-delgado',
      'prod-soporte-celular-tuba-tudel-ancho',
    ],
  },
  { id: 'item-2', tipo: 'banner', titulo: null, visible: true, orden: 1, imagenUrl: null, link: null, productoIds: [] },
  {
    id: 'item-3',
    tipo: 'seccion',
    titulo: 'Sordinas',
    visible: true,
    orden: 2,
    imagenUrl: null,
    link: null,
    productoIds: ['prod-sordina-trombon', 'prod-sordina-trompeta'],
  },
  {
    id: 'item-4',
    tipo: 'seccion',
    titulo: 'BERP',
    visible: true,
    orden: 3,
    imagenUrl: null,
    link: null,
    productoIds: ['prod-berp-trombon', 'prod-berp-trompeta', 'prod-berp-euphonium'],
  },
];

export async function getHeroImages(): Promise<HomeHeroImage[]> {
  return heroImages;
}

export async function getHomeItems(): Promise<HomeItem[]> {
  return homeItems;
}
