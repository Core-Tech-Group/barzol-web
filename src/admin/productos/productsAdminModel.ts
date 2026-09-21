import { IMAGE_MIME_TYPES } from '@shared/lib/validation/mediaSchema';

export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');

export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  instrument: string;
  vendor: string;
  price: string;
  originalPrice: string;
  description: string;
  keywords: string;
  features: string[];
  photos: (string | null)[];
  statusLabel: 'Publicado' | 'Borrador';
  active: boolean;
  customizable: boolean;
  ratingAvg?: number;
  ratingCount?: number;
}
export interface EditDraft {
  name: string;
  category: string;
  instrument: string;
  vendor: string;
  price: string;
  originalPrice: string;
  description: string;
  keywords: string;
  features: string[];
  photos: (string | null)[];
  statusLabel: 'Publicado' | 'Borrador';
  active: boolean;
  customizable: boolean;
}

/** Rótulo del filtro "sin filtrar". Una sola fuente: ProductosView lo antepone a
 *  la lista de categorías y esta isla lo reconoce. Si difieren, el filtro deja
 *  la lista vacía y el rótulo aparece como categoría elegible en el formulario. */
export const TODAS_LAS_CATEGORIAS = 'Todos';

export interface ProductsAdminProps {
  initialProducts: AdminProduct[];
  categories: string[]; // incluye TODAS_LAS_CATEGORIAS como primer elemento
  instrumentsByCategory: Record<string, string[]>;
  vendors: string[];
}

export const PAGE_SIZE = 10;
export const EMPTY_PHOTOS: (string | null)[] = [null, null, null, null, null];

export function emptyDraft(category: string, vendor: string): EditDraft {
  return {
    name: '',
    category,
    // La subcategoría es opcional — arranca sin elegir, no con la primera
    // de la lista (ver productoService.ts: resolveCategoryLeafId).
    instrument: '',
    vendor,
    price: '',
    originalPrice: '',
    description: '',
    keywords: '',
    features: [],
    photos: [...EMPTY_PHOTOS],
    statusLabel: 'Borrador',
    active: true,
    customizable: true,
  };
}

export function draftFromProduct(p: AdminProduct): EditDraft {
  return {
    name: p.name,
    category: p.category,
    instrument: p.instrument,
    vendor: p.vendor,
    price: p.price,
    originalPrice: p.originalPrice,
    description: p.description,
    keywords: p.keywords,
    features: [...p.features],
    photos: [...p.photos],
    statusLabel: p.statusLabel,
    active: p.active,
    customizable: p.customizable,
  };
}

export function draftToWriteInput(draft: EditDraft, cleanFeatures: string[]) {
  return {
    nombre: draft.name.trim(),
    categoriaNombre: draft.category,
    subcategoriaNombre: draft.instrument || null,
    vendorNombre: draft.vendor,
    precio: Number(draft.price),
    precioOriginal: draft.originalPrice.trim() ? Number(draft.originalPrice) : null,
    descripcion: draft.description,
    keywords: draft.keywords,
    caracteristicas: cleanFeatures,
    fotos: draft.photos.filter((p): p is string => !!p),
    publicado: draft.statusLabel === 'Publicado',
    activo: draft.active,
    personalizable: draft.customizable,
  };
}
