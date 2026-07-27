export interface Category {
  id: string;
  nombre: string;
  slug: string;
  imagenUrl: string | null;
}

export interface Product {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoriaId: string;
  imagenUrl: string;
  destacado: boolean;
  disponible: boolean;
  createdAt: string;
}

export interface GalleryItem {
  id: string;
  imagenUrl: string;
  descripcion: string | null;
  createdAt: string;
}
