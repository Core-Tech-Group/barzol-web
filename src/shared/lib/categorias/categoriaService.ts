import type { Category } from '../../types';

// ÚNICA fuente de categorías del proyecto (ver ARCHITECTURE.md § Regla de
// datos mock). landing/shared/Header.astro y todas las vistas de admin deben
// leer de aquí — ninguna debe definir su propio arreglo de categorías. La
// navegación pública /catalogo/[slug] usa exactamente estas categorías
// (instrumentos), las mismas que se administran en /admin/categorias — no
// una taxonomía alternativa.
//
// TODO: reemplazar el arreglo mock por una consulta real (Supabase/Drizzle o
// Prisma) cuando esté listo el ORM. La firma de cada función no cambia, así
// que ningún consumidor (vistas, endpoints de pages/api/categorias) se toca.

// Slugs de tipo de accesorio (subcategoría) — se repiten entre instrumentos
// a propósito, identifican el TIPO sin ser una ruta propia.
const SLUG_SOPORTE = 'soportes-para-celular';
const SLUG_SORDINA = 'sordinas';
const SLUG_BERP = 'berp';

const categorias: Category[] = [
  {
    id: 'cat-trompeta',
    nombre: 'Trompeta',
    slug: 'trompeta',
    orden: 0,
    subcategorias: [
      { id: 'sub-trompeta-soporte', categoriaId: 'cat-trompeta', nombre: 'Soporte de celular', slug: SLUG_SOPORTE, orden: 0 },
      { id: 'sub-trompeta-sordina', categoriaId: 'cat-trompeta', nombre: 'Sordina', slug: SLUG_SORDINA, orden: 1 },
      { id: 'sub-trompeta-berp', categoriaId: 'cat-trompeta', nombre: 'BERP', slug: SLUG_BERP, orden: 2 },
    ],
  },
  {
    id: 'cat-clarinete',
    nombre: 'Clarinete',
    slug: 'clarinete',
    orden: 1,
    subcategorias: [{ id: 'sub-clarinete-soporte', categoriaId: 'cat-clarinete', nombre: 'Soporte de celular', slug: SLUG_SOPORTE, orden: 0 }],
  },
  {
    id: 'cat-euphonium',
    nombre: 'Euphonium',
    slug: 'euphonium',
    orden: 2,
    subcategorias: [
      { id: 'sub-euphonium-soporte', categoriaId: 'cat-euphonium', nombre: 'Soporte de celular', slug: SLUG_SOPORTE, orden: 0 },
      { id: 'sub-euphonium-berp', categoriaId: 'cat-euphonium', nombre: 'BERP', slug: SLUG_BERP, orden: 1 },
    ],
  },
  {
    id: 'cat-trombon',
    nombre: 'Trombón',
    slug: 'trombon',
    orden: 3,
    subcategorias: [
      { id: 'sub-trombon-soporte', categoriaId: 'cat-trombon', nombre: 'Soporte de celular', slug: SLUG_SOPORTE, orden: 0 },
      { id: 'sub-trombon-sordina', categoriaId: 'cat-trombon', nombre: 'Sordina', slug: SLUG_SORDINA, orden: 1 },
      { id: 'sub-trombon-berp', categoriaId: 'cat-trombon', nombre: 'BERP', slug: SLUG_BERP, orden: 2 },
    ],
  },
  {
    id: 'cat-tuba',
    nombre: 'Tuba',
    slug: 'tuba',
    orden: 4,
    subcategorias: [{ id: 'sub-tuba-soporte', categoriaId: 'cat-tuba', nombre: 'Soporte de celular', slug: SLUG_SOPORTE, orden: 0 }],
  },
  {
    id: 'cat-saxofon',
    nombre: 'Saxofón',
    slug: 'saxofon',
    orden: 5,
    subcategorias: [{ id: 'sub-saxofon-soporte', categoriaId: 'cat-saxofon', nombre: 'Soporte de celular', slug: SLUG_SOPORTE, orden: 0 }],
  },
  {
    id: 'cat-saxo',
    nombre: 'Saxo',
    slug: 'saxo',
    orden: 6,
    subcategorias: [{ id: 'sub-saxo-soporte', categoriaId: 'cat-saxo', nombre: 'Soporte de celular', slug: SLUG_SOPORTE, orden: 0 }],
  },
];

export async function getCategorias(): Promise<Category[]> {
  return categorias;
}

export async function getCategoriaById(id: string): Promise<Category | null> {
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
