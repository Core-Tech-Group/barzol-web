// Tipos de dominio compartidos entre landing/ y admin/. Reflejan el esquema
// documentado en DATABASE_SCHEMA.md — ver ese archivo para el diagrama
// entidad-relación completo. Estas son las formas "agregadas" que devuelven
// los servicios (ej. Category ya trae sus subcategorías anidadas), no filas
// crudas de tabla — esas viven en los *Mapper.ts de cada servicio.

export interface Vendor {
  id: string;
  nombre: string;
}

export interface Subcategory {
  id: string;
  codigo: number; // `code` en la DB — numérico, uso interno/inventario, YA NO es la base del slug público
  categoriaId: string;
  nombre: string;
  slug: string; // no se persiste — se calcula desde `nombre` (ver categoriaMapper.ts). Identifica el TIPO de accesorio (ej. "sordinas"), usado como sub-filtro dentro de la página de categoría, no como ruta propia
  orden: number;
}

export interface Category {
  id: string;
  codigo: number; // `code` en la DB — numérico, uso interno/inventario, YA NO es la base del slug público
  nombre: string;
  slug: string; // no se persiste — se calcula desde `nombre` (ver categoriaMapper.ts). Única fuente de verdad de la navegación pública /catalogo/[slug] — debe reflejar exactamente lo administrado en /admin/categorias
  orden: number;
  subcategorias: Subcategory[];
}

export interface Product {
  id: string;
  codigo: number; // `code` en la DB — numérico, uso interno/inventario (ej. SKU de almacén)
  nombre: string;
  slug: string; // no se persiste — se calcula desde `nombre` (ver productoMapper.ts)
  descripcion: string;
  keywords: string;
  precio: number;
  precioOriginal: number | null;
  categoriaId: string; // instrumento — obligatorio (ver DATABASE_SCHEMA.md: product.category_id es NOT NULL). Se deriva del padre de subcategoriaId cuando este apunta a una subcategoría anidada
  subcategoriaId: string | null; // null solo si categoriaId ya es en sí una categoría hoja (sin subcategorías propias)
  vendorId: string;
  publicado: boolean;
  activo: boolean;
  personalizable: boolean;
  createdAt: string;
  fotos: string[];
  caracteristicas: string[];
}

export interface GalleryItem {
  id: string;
  tipo: 'accesorios' | 'trabajos';
  imagenUrl: string | null;
  titulo: string;
  orden: number;
}

export interface HomeHeroImage {
  id: string;
  imagenUrl: string | null;
  orden: number;
}

export interface HomeItem {
  id: string;
  tipo: 'seccion' | 'banner';
  titulo: string | null;
  visible: boolean;
  orden: number;
  imagenUrl: string | null;
  link: string | null;
  productoIds: string[];
}

// Fila única (singleton) — respaldada por el backlog: "Admin > Configuración
// > Panel de configuración" (issue #28).
export interface Configuracion {
  id: string;
  whatsappNumero: string;
  emailContacto: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  direccion: string | null;
}
