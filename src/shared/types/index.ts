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
  categoriaId: string;
  nombre: string;
  slug: string; // identifica el TIPO de accesorio (ej. "sordinas") — usado como sub-filtro dentro de la página de categoría, no como ruta propia
  orden: number;
}

export interface Category {
  id: string;
  nombre: string;
  slug: string; // única fuente de verdad de la navegación pública /catalogo/[slug] — debe reflejar exactamente lo administrado en /admin/categorias
  orden: number;
  subcategorias: Subcategory[];
}

export interface Product {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  keywords: string;
  precio: number;
  precioOriginal: number | null;
  categoriaId: string | null; // nullable: hay accesorios genéricos sin instrumento asociado (ej. "Tope Protector de Vara")
  subcategoriaId: string | null;
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
// > Panel de configuración" (issue #28), "Botón de WhatsApp: redirigir con
// texto... predefinidos" (issue #5) y "Agregar banner que indique
// personalización" + "Imagen del banner de personalización" (issues #21/#22).
export interface Configuracion {
  id: string;
  whatsappNumero: string;
  whatsappMensajePredefinido: string;
  emailContacto: string;
  instagramUrl: string | null;
  facebookUrl: string | null;
  direccion: string | null;
  bannerPersonalizacionImagenUrl: string | null;
}
