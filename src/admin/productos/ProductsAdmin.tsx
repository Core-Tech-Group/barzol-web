import { useEffect, useMemo, useRef, useState } from 'react';
import { queueSuccessMessage, consumeSuccessMessage } from '@admin/shared/successMessage';
import type { ApiResponse } from '@shared/api/apiResponse';
import { optimizeImageFile, extensionForMimeType } from '@shared/lib/media/imageOptimizer';
import { subirMedia } from '@shared/lib/media/uploadClient';
import { IMAGE_MIME_TYPES } from '@shared/lib/validation/mediaSchema';
import { PAGE_SIZE, EMPTY_PHOTOS, TODAS_LAS_CATEGORIAS, emptyDraft, draftFromProduct, draftToWriteInput, type AdminProduct, type EditDraft, type ProductsAdminProps } from './productsAdminModel';
import ProductsAdminList from './ProductsAdminList';
import ProductsAdminDialogs from './ProductsAdminDialogs';
import ProductEditModal from './ProductEditModal';
import { createFeatureActions } from './productFeatures';

export { TODAS_LAS_CATEGORIAS } from './productsAdminModel';
export type { AdminProduct } from './productsAdminModel';

export function useProductsAdminModel({ initialProducts, categories, instrumentsByCategory, vendors }: ProductsAdminProps) {
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState(TODAS_LAS_CATEGORIAS);
  const [page, setPage] = useState(1);

  // null = cerrado, -1 = creando nuevo, >=0 = editando products[index]
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  // Vista previa local de la foto elegida (blob: URL, solo para mostrar en
  // esta sesión de edición) — lo que se guarda de verdad es la URL pública de
  // R2 (editDraft.photos[i]), nunca el contenido en base64.
  const [photoPreviews, setPhotoPreviews] = useState<Record<number, string>>({});
  // true mientras una foto se está optimizando en ese slot (la subida a R2 ya
  // no ocurre acá: pasa al guardar).
  const [procesandoFotos, setProcesandoFotos] = useState<Record<number, boolean>>({});
  // Fotos ya optimizadas esperando el "Guardar cambios" que las sube. Es un
  // ref y no estado porque lo que se dibuja es la vista previa, no el blob.
  const fotosPendientes = useRef<Record<number, Blob>>({});
  // Se incrementa cada vez que se empieza o se cancela el procesado de ese
  // índice — un resultado viejo que resuelve tarde se compara contra esto y,
  // si ya no es el vigente, no toca el estado (evita pisar una foto más
  // nueva con el resultado de una más vieja).
  const photoUploadToken = useRef<Record<number, number>>({});
  const [showValidation, setShowValidation] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'cat' | 'sub' | null>(null);
  const [catSearchQuery, setCatSearchQuery] = useState('');

  const [dupConfirmIndex, setDupConfirmIndex] = useState(-1);
  const [delConfirmIndex, setDelConfirmIndex] = useState(-1);
  const [navConfirmOpen, setNavConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingMessage, setSavingMessage] = useState('Guardando producto...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const msg = consumeSuccessMessage();
    if (msg) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  }, []);

  function showError(message: string) {
    clearTimeout(errorTimer.current);
    setErrorMsg(message);
    errorTimer.current = setTimeout(() => setErrorMsg(null), 3600);
  }

  const dragPhoto = useRef<{ from: number } | null>(null);
  const [overPhoto, setOverPhoto] = useState<number | null>(null);
  const dragFeature = useRef<{ from: number } | null>(null);
  const [overFeature, setOverFeature] = useState<number | null>(null);

  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Puente con el sidebar (fuera de esta isla): mientras haya un modal de
  // edición abierto, avisamos vía window global para que AdminLayout
  // intercepte los clicks de navegación y nos deje decidir.
  useEffect(() => {
    window.__adminHasUnsavedChanges = editIndex !== null;
    return () => {
      window.__adminHasUnsavedChanges = false;
    };
  }, [editIndex]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ href: string }>).detail;
      if (detail?.href) {
        setPendingHref(detail.href);
        setNavConfirmOpen(true);
      }
    }
    document.addEventListener('admin:nav-request', handler);
    return () => document.removeEventListener('admin:nav-request', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .map((p, i) => ({ ...p, _i: i }))
      .filter((p) => (activeCat === TODAS_LAS_CATEGORIAS || p.category === activeCat) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, query, activeCat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // ---------- Acciones sobre productos ----------

  function resetPhotoPreviews() {
    setPhotoPreviews((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      return {};
    });
    // Las fotos que nunca llegaron a guardarse se descartan con la edición.
    fotosPendientes.current = {};
    setProcesandoFotos({});
  }

  function openEdit(i: number) {
    resetPhotoPreviews();
    setEditDraft(draftFromProduct(products[i]));
    setEditIndex(i);
    setShowValidation(false);
  }

  function openNewProduct() {
    resetPhotoPreviews();
    const firstCat = categories.find((c) => c !== TODAS_LAS_CATEGORIAS) || '';
    setEditDraft(emptyDraft(firstCat, vendors[0] || 'BARZOL'));
    setEditIndex(-1);
    setShowValidation(false);
  }

  function closeEdit() {
    if (saving) return;
    resetPhotoPreviews();
    setEditIndex(null);
    setEditDraft(null);
    setShowValidation(false);
    setOpenDropdown(null);
  }

  async function saveEdit() {
    if (!editDraft) return;
    if (Object.values(procesandoFotos).some(Boolean)) {
      showError('Esperá a que terminen de procesarse las fotos.');
      return;
    }
    const needsPhoto = editDraft.statusLabel === 'Publicado' && editDraft.active;
    // Cuenta tanto las ya guardadas como las que están por subirse en este
    // mismo guardado.
    const hasPhoto = editDraft.photos.some(Boolean) || Object.keys(fotosPendientes.current).length > 0;
    const errors: string[] = [];
    if (needsPhoto && !hasPhoto) errors.push('edit-section-photos');
    if (!editDraft.name.trim()) errors.push('edit-field-name');
    if (!editDraft.price.trim()) errors.push('edit-field-price');

    if (errors.length > 0) {
      setShowValidation(true);
      requestAnimationFrame(() => {
        const target = document.getElementById(errors[0]);
        const scroller = modalScrollRef.current;
        if (target && scroller) {
          scroller.scrollTop = target.offsetTop - scroller.offsetTop - 12;
        }
      });
      return;
    }

    const cleanFeatures = editDraft.features.filter((f) => f.trim().length > 0);
    const isNew = editIndex === -1;
    const url = isNew ? '/api/productos' : `/api/productos/${products[editIndex as number].id}`;

    setSaving(true);
    setSavingMessage('Guardando producto...');
    try {
      // Las fotos suben acá, no al elegirlas: ya se validó que el producto
      // tiene nombre, que es con lo que se nombra el archivo en R2.
      const fotos = await subirFotosPendientes(editDraft);
      setSavingMessage('Guardando producto...');
      const payload = { ...draftToWriteInput(editDraft, cleanFeatures), fotos };

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !body.success) throw new Error(body.message || 'No se pudo guardar el producto.');
      window.__adminHasUnsavedChanges = false;
      queueSuccessMessage(isNew ? 'Producto creado exitosamente' : 'Producto actualizado exitosamente');
      window.location.reload();
    } catch (e) {
      setSaving(false);
      showError((e as Error).message);
    }
  }

  function toggleActive(i: number) {
    setProducts((prev) => prev.map((p, idx) => (idx === i ? { ...p, active: !p.active } : p)));
  }

  async function confirmDuplicate() {
    if (dupConfirmIndex < 0) return;
    const src = products[dupConfirmIndex];
    const draft = draftFromProduct(src);
    draft.name = src.name + ' (copia)';
    draft.statusLabel = 'Borrador';
    // La copia arranca sin fotos: copiarlas dejaría dos productos apuntando al
    // mismo objeto de R2, con el nombre del original en la URL. Se cargan las
    // suyas al editarla.
    draft.photos = [...EMPTY_PHOTOS];
    const payload = draftToWriteInput(draft, draft.features);

    setSaving(true);
    setSavingMessage('Duplicando producto...');
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !body.success) throw new Error(body.message || 'No se pudo duplicar el producto.');
      queueSuccessMessage('Producto duplicado exitosamente');
      window.location.reload();
    } catch (e) {
      setSaving(false);
      showError((e as Error).message);
    } finally {
      setDupConfirmIndex(-1);
    }
  }

  async function confirmDelete() {
    if (delConfirmIndex < 0) return;
    const target = products[delConfirmIndex];
    setDeleting(true);
    try {
      const res = await fetch(`/api/productos/${target.id}`, { method: 'DELETE' });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !body.success) throw new Error(body.message || 'No se pudo eliminar el producto.');
      queueSuccessMessage('Producto eliminado exitosamente');
      window.location.reload();
    } catch (e) {
      setDeleting(false);
      showError((e as Error).message);
    } finally {
      setDelConfirmIndex(-1);
    }
  }

  function confirmNavigate() {
    window.__adminHasUnsavedChanges = false;
    if (pendingHref) window.location.href = pendingHref;
  }

  // ---------- Fotos: en dos tiempos.
  //
  // Al elegir el archivo solo se optimiza (redimensiona + reencoda a WebP, ver
  // imageOptimizer.ts) y el resultado queda en memoria con su vista previa. La
  // subida a R2 vía /api/media ocurre al guardar, en `subirFotosPendientes`.
  //
  // Se separa así por dos motivos: al guardar ya se validó que el producto
  // tiene nombre —que es con lo que se nombra el archivo en R2— y cancelar la
  // edición no deja imágenes huérfanas en el bucket.
  //
  // `editDraft.photos[i]` guarda solo URLs públicas ya subidas; una foto
  // recién elegida vive en `fotosPendientes` hasta que se guarda.
  // ----------

  async function handlePhotoFile(index: number, file: File | null) {
    if (!file) return;

    const myToken = (photoUploadToken.current[index] ?? 0) + 1;
    photoUploadToken.current[index] = myToken;
    const isCurrent = () => photoUploadToken.current[index] === myToken;

    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      showError('Formato no soportado — usá JPG, PNG, WEBP o AVIF.');
      return;
    }

    setProcesandoFotos((prev) => ({ ...prev, [index]: true }));
    try {
      const { blob } = await optimizeImageFile(file);
      if (!isCurrent()) return; // se reemplazó o se quitó esta foto mientras se optimizaba

      // Queda en memoria hasta "Guardar cambios": recién ahí se sube, cuando
      // el nombre del producto ya está definido y sirve para nombrar el
      // archivo. Además, cancelar la edición no deja huérfanos en R2.
      fotosPendientes.current[index] = blob;

      // La vista previa sale del blob YA optimizado, no del archivo original:
      // se ve exactamente lo que se va a subir.
      const previewUrl = URL.createObjectURL(blob);
      setPhotoPreviews((prev) => {
        const old = prev[index];
        if (old) URL.revokeObjectURL(old);
        return { ...prev, [index]: previewUrl };
      });

      // Si el slot tenía una foto ya guardada, se descarta: la reemplaza esta.
      setEditDraft((d) => {
        if (!d) return d;
        const photos = [...d.photos];
        photos[index] = null;
        return { ...d, photos };
      });
    } catch (e) {
      if (!isCurrent()) return;
      showError((e as Error).message || 'No se pudo procesar la imagen.');
    } finally {
      if (isCurrent()) setProcesandoFotos((prev) => ({ ...prev, [index]: false }));
    }
  }

  /**
   * Sube a R2 las fotos que quedaron pendientes y devuelve la lista final de
   * URLs, en el orden de los slots. Se llama desde `saveEdit`, no al elegir el
   * archivo: para entonces el producto ya tiene nombre.
   */
  async function subirFotosPendientes(draft: EditDraft): Promise<string[]> {
    const pendientes = Object.entries(fotosPendientes.current);
    const fotos = [...draft.photos];

    if (pendientes.length > 0) {
      setSavingMessage(pendientes.length === 1 ? 'Subiendo la foto...' : 'Subiendo las fotos...');
      // El nombre del producto, no el del archivo que eligió el admin: las
      // cámaras y WhatsApp producen nombres como "IMG_2481" o "WhatsApp Image
      // 2026-07-10 at 6.17.07 PM", que terminaban dentro de la URL pública. Se
      // manda en crudo — `sanitizeFileName` (mediaKey.ts) ya lo pasa a
      // minúsculas, le quita tildes y lo separa con guiones al armar la clave.
      const baseName = draft.name.trim() || 'producto';

      const subidas = await Promise.all(
        pendientes.map(async ([indice, blob]) => {
          const extension = extensionForMimeType(blob.type);
          const guardada = await subirMedia(blob, { carpeta: 'productos', nombreArchivo: `${baseName}.${extension}` });
          return { indice: Number(indice), url: guardada.publicUrl };
        })
      );
      subidas.forEach(({ indice, url }) => {
        fotos[indice] = url;
      });
    }

    return fotos.filter((p): p is string => !!p);
  }

  // Botón de arriba: elegir varias fotos de una — llena los espacios vacíos
  // en orden, una llamada a handlePhotoFile por archivo.
  function handlePhotosSelected(files: FileList | null) {
    if (!files || !editDraft) return;
    const emptyIndexes = editDraft.photos.map((p, i) => (p === null ? i : -1)).filter((i) => i >= 0);
    Array.from(files)
      .slice(0, emptyIndexes.length)
      .forEach((file, k) => handlePhotoFile(emptyIndexes[k], file));
  }

  function removePhoto(index: number) {
    photoUploadToken.current[index] = (photoUploadToken.current[index] ?? 0) + 1; // invalida un procesado en curso
    delete fotosPendientes.current[index];
    setProcesandoFotos((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setPhotoPreviews((prev) => {
      const old = prev[index];
      if (old) URL.revokeObjectURL(old);
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setEditDraft((d) => {
      if (!d) return d;
      const photos = [...d.photos];
      photos[index] = null;
      return { ...d, photos };
    });
  }

  function swapPhotos(a: number, b: number) {
    setPhotoPreviews((prev) => ({ ...prev, [a]: prev[b], [b]: prev[a] }));
    // Los blobs pendientes acompañan a su slot, o al guardar terminarían en la
    // posición equivocada.
    const pend = fotosPendientes.current;
    const [pa, pb] = [pend[a], pend[b]];
    if (pb) pend[a] = pb;
    else delete pend[a];
    if (pa) pend[b] = pa;
    else delete pend[b];
    setEditDraft((d) => {
      if (!d) return d;
      const photos = [...d.photos];
      [photos[a], photos[b]] = [photos[b], photos[a]];
      return { ...d, photos };
    });
  }

  const { addFeature, updateFeature, removeFeature, reorderFeature } = createFeatureActions(setEditDraft);

  const catOptions = categories.filter((c) => c !== TODAS_LAS_CATEGORIAS);
  const filteredCatOptions = catOptions.filter((c) => c.toLowerCase().includes(catSearchQuery.toLowerCase()));
  const subOptions = editDraft ? instrumentsByCategory[editDraft.category] || [] : [];

  return {
    categories,
    vendors,
    products,
    query,
    setQuery,
    activeCat,
    setActiveCat,
    setPage,
    editIndex,
    editDraft,
    setEditDraft,
    photoPreviews,
    procesandoFotos,
    showValidation,
    openDropdown,
    setOpenDropdown,
    catSearchQuery,
    setCatSearchQuery,
    dupConfirmIndex,
    setDupConfirmIndex,
    delConfirmIndex,
    setDelConfirmIndex,
    navConfirmOpen,
    setNavConfirmOpen,
    setPendingHref,
    saving,
    deleting,
    savingMessage,
    errorMsg,
    successMsg,
    dragPhoto,
    overPhoto,
    setOverPhoto,
    dragFeature,
    overFeature,
    setOverFeature,
    modalScrollRef,
    filtered,
    totalPages,
    safePage,
    pageStart,
    pageItems,
    openEdit,
    openNewProduct,
    closeEdit,
    saveEdit,
    toggleActive,
    confirmDuplicate,
    confirmDelete,
    confirmNavigate,
    handlePhotoFile,
    handlePhotosSelected,
    removePhoto,
    swapPhotos,
    addFeature,
    updateFeature,
    removeFeature,
    reorderFeature,
    filteredCatOptions,
    subOptions,
  };
}

export type ProductsAdminModel = ReturnType<typeof useProductsAdminModel>;

export default function ProductsAdmin(props: ProductsAdminProps) {
  const view = useProductsAdminModel(props);
  if (!view.editDraft && view.editIndex !== null) return null;
  return (
    <>
      <ProductsAdminList view={view} />
      <ProductsAdminDialogs view={view} />
      <ProductEditModal view={view} />
    </>
  );
}
