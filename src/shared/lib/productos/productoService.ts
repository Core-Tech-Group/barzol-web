import type { Product, Vendor } from '../../types';

// ÚNICA fuente de productos del proyecto (ver ARCHITECTURE.md § Regla de
// datos mock). Ninguna vista debe definir su propio arreglo de productos.
//
// TODO: reemplazar el arreglo mock por una consulta real (Supabase/Drizzle o
// Prisma) cuando esté listo el ORM. La firma de cada función no cambia, así
// que ningún consumidor (vistas, endpoints de pages/api/productos) se toca.
// Ver productoMapper.ts: ya documenta la forma de la fila cruda de Supabase
// y la función que la convierte a `Product` — la consulta real solo tiene
// que llamarla.

const vendors: Vendor[] = [{ id: 'vendor-barzol', nombre: 'BARZOL' }];

const CREATED_AT = '2026-01-15T00:00:00.000Z';

const defaultCaracteristicas = [
  'Permite sujetar el celular de forma segura al instrumento.',
  'Ideal para visualizar partituras, pistas musicales o referencias mientras tocas.',
  'Brinda mayor comodidad durante las presentaciones.',
  'Personalización disponible (nombre, logo o detalle especial) — bajo pedido.',
];
const sordinaCaracteristicas = [
  'Fabricada a medida para el instrumento.',
  'Material ligero y resistente.',
  'Personalización disponible (nombre, logo o detalle especial) — bajo pedido.',
];
const berpCaracteristicas = ['Compatible con el instrumento indicado.', 'Personalización disponible (nombre, logo o detalle especial) — bajo pedido.'];

const soporteDesc = 'Incorpora un mejor ángulo de inclinación, mayor versatilidad y una posición de lectura más cómoda para evitar distracciones.';
const sordinaDesc = 'Reduce el volumen del instrumento manteniendo la calidad del sonido, ideal para ensayos y espacios reducidos.';
const berpDesc = 'Accesorio de práctica para desarrollar resistencia y técnica de embocadura.';

function producto(
  p: Omit<Product, 'id' | 'vendorId' | 'keywords' | 'fotos' | 'createdAt' | 'publicado'> & { publicado?: boolean }
): Product {
  return {
    id: 'prod-' + p.slug,
    vendorId: 'vendor-barzol',
    keywords: '',
    fotos: [],
    createdAt: CREATED_AT,
    publicado: p.publicado ?? true,
    ...p,
  };
}

const productos: Product[] = [
  producto({
    nombre: 'Soporte de Celular Trompeta',
    slug: 'soporte-celular-trompeta',
    categoriaId: 'cat-trompeta',
    subcategoriaId: 'sub-trompeta-soporte',
    precio: 160,
    precioOriginal: 180,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Clarinete',
    slug: 'soporte-celular-clarinete',
    categoriaId: 'cat-clarinete',
    subcategoriaId: 'sub-clarinete-soporte',
    precio: 175,
    precioOriginal: 200,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Euphonium Frontal',
    slug: 'soporte-celular-euphonium-frontal',
    categoriaId: 'cat-euphonium',
    subcategoriaId: 'sub-euphonium-soporte',
    precio: 185,
    precioOriginal: 210,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Euphonium Recto',
    slug: 'soporte-celular-euphonium-recto',
    categoriaId: 'cat-euphonium',
    subcategoriaId: 'sub-euphonium-soporte',
    precio: 185,
    precioOriginal: 210,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Trombón (Tudel Delgado)',
    slug: 'soporte-celular-trombon-tudel-delgado',
    categoriaId: 'cat-trombon',
    subcategoriaId: 'sub-trombon-soporte',
    precio: 170,
    precioOriginal: 195,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Trombón (Tudel Ancho)',
    slug: 'soporte-celular-trombon-tudel-ancho',
    categoriaId: 'cat-trombon',
    subcategoriaId: 'sub-trombon-soporte',
    precio: 170,
    precioOriginal: 195,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Tuba (Tudel Ancho)',
    slug: 'soporte-celular-tuba-tudel-ancho',
    categoriaId: 'cat-tuba',
    subcategoriaId: 'sub-tuba-soporte',
    precio: 200,
    precioOriginal: 230,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Tuba (Tudel Delgado)',
    slug: 'soporte-celular-tuba-tudel-delgado',
    categoriaId: 'cat-tuba',
    subcategoriaId: 'sub-tuba-soporte',
    precio: 200,
    precioOriginal: 230,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Saxofón Alto',
    slug: 'soporte-celular-saxofon-alto',
    categoriaId: 'cat-saxofon',
    subcategoriaId: 'sub-saxofon-soporte',
    precio: 160,
    precioOriginal: 180,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Soporte de Celular Saxo Tenor',
    slug: 'soporte-celular-saxo-tenor',
    categoriaId: 'cat-saxo',
    subcategoriaId: 'sub-saxo-soporte',
    precio: 165,
    precioOriginal: 190,
    activo: true,
    personalizable: true,
    descripcion: soporteDesc,
    caracteristicas: [...defaultCaracteristicas],
  }),
  producto({
    nombre: 'Sordina para Trombón',
    slug: 'sordina-trombon',
    categoriaId: 'cat-trombon',
    subcategoriaId: 'sub-trombon-sordina',
    precio: 210,
    precioOriginal: null,
    activo: true,
    personalizable: true,
    descripcion: sordinaDesc,
    caracteristicas: [...sordinaCaracteristicas],
  }),
  producto({
    nombre: 'Sordina para Trompeta',
    slug: 'sordina-trompeta',
    categoriaId: 'cat-trompeta',
    subcategoriaId: 'sub-trompeta-sordina',
    precio: 190,
    precioOriginal: null,
    activo: true,
    personalizable: true,
    descripcion: sordinaDesc,
    caracteristicas: [...sordinaCaracteristicas],
  }),
  producto({
    nombre: 'Tope Protector de Vara',
    slug: 'tope-protector-vara',
    categoriaId: null,
    subcategoriaId: null,
    precio: 95,
    precioOriginal: null,
    activo: true,
    personalizable: false,
    descripcion: 'Protege la vara del instrumento frente a golpes y desgaste durante el uso diario.',
    caracteristicas: ['Ajuste seguro y firme.', 'Resistente al uso prolongado.'],
  }),
  producto({
    nombre: 'BERP para Trombón',
    slug: 'berp-trombon',
    categoriaId: 'cat-trombon',
    subcategoriaId: 'sub-trombon-berp',
    precio: 180,
    precioOriginal: null,
    activo: true,
    personalizable: true,
    descripcion: berpDesc,
    caracteristicas: [...berpCaracteristicas],
  }),
  producto({
    nombre: 'BERP para Trompeta',
    slug: 'berp-trompeta',
    categoriaId: 'cat-trompeta',
    subcategoriaId: 'sub-trompeta-berp',
    precio: 175,
    precioOriginal: null,
    activo: true,
    personalizable: true,
    descripcion: berpDesc,
    caracteristicas: [...berpCaracteristicas],
  }),
  producto({
    nombre: 'BERP para Euphonium',
    slug: 'berp-euphonium',
    categoriaId: 'cat-euphonium',
    subcategoriaId: 'sub-euphonium-berp',
    precio: 185,
    precioOriginal: null,
    activo: true,
    personalizable: true,
    publicado: false,
    descripcion: berpDesc,
    caracteristicas: [...berpCaracteristicas],
  }),
];

export async function getProductos(): Promise<Product[]> {
  return productos;
}

export async function getProductoById(id: string): Promise<Product | null> {
  return productos.find((p) => p.id === id) ?? null;
}

export async function getVendors(): Promise<Vendor[]> {
  return vendors;
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
