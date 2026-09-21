import { useEffect, useRef, useState } from 'react';
import { subirImagen } from '@shared/lib/media/uploadClient';
import { guardarInicio } from './guardarInicio';

export interface AllProduct {
  /** SPEC-904 REQ-974 — la identidad es el id; `name` solo se pinta. */
  id: string;
  name: string;
  category: string;
}

export interface HomeSectionItem {
  id: string;
  type: 'section';
  title: string;
  visible: boolean;
  open: boolean;
  /** Ids de producto, NO nombres (REQ-974). El nombre se resuelve al pintar. */
  products: string[];
  isNew?: boolean;
}

export interface HomeBannerItem {
  id: string;
  type: 'banner';
  visible: boolean;
  open: boolean;
  link: string;
  image: string | null;
}

export type HomeItem = HomeSectionItem | HomeBannerItem;

interface Props {
  initialItems: HomeItem[];
  allProducts: AllProduct[];
  initialHeroImages?: (string | null)[];
}

// ---------- Iconos ----------

import InicioAdminView from './InicioAdminView';

export function useInicioAdminModel({ initialItems, allProducts, initialHeroImages }: Props) {
  const [items, setItems] = useState<HomeItem[]>(initialItems);
  const [heroImages, setHeroImages] = useState<(string | null)[]>(initialHeroImages ?? [null, null, null]);
  const [heroImagesOpen, setHeroImagesOpen] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState('');
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [delConfirmIndex, setDelConfirmIndex] = useState(-1);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');

  const [picker, setPicker] = useState<{ itemId: string; title: string } | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const [navConfirmOpen, setNavConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const dragItem = useRef<{ from: number } | null>(null);
  const [overItemIndex, setOverItemIndex] = useState<number | null>(null);
  const dragProduct = useRef<{ itemId: string; from: number } | null>(null);
  const [overProduct, setOverProduct] = useState<{ itemId: string; index: number } | null>(null);

  const idSeq = useRef(0);
  function genId() {
    idSeq.current += 1;
    return 'new-' + Date.now() + '-' + idSeq.current;
  }

  const errorToastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedToastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    window.__adminHasUnsavedChanges = dirty;
    return () => {
      window.__adminHasUnsavedChanges = false;
    };
  }, [dirty]);

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

  useEffect(() => {
    if (!editingItemId) return;
    const el = document.querySelector<HTMLInputElement>(`[data-item-edit-input="${editingItemId}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [editingItemId]);

  function markDirty() {
    setDirty(true);
  }

  /**
   * Un solo camino para todo lo que sale mal, con el mensaje real.
   *
   * El toast de error tenía el texto incrustado ("Completa los títulos
   * vacíos..."), así que era literalmente incapaz de informar de cualquier otro
   * fallo. Un error de RLS o una imagen que no subió habrían salido con ese
   * mismo texto, o con ninguno.
   */
  function mostrarError(mensaje: string) {
    clearTimeout(errorToastTimer.current);
    setErrorMensaje(mensaje);
    setShowErrorToast(true);
    errorToastTimer.current = setTimeout(() => setShowErrorToast(false), 5000);
  }

  function confirmNavigate() {
    window.__adminHasUnsavedChanges = false;
    if (pendingHref) window.location.href = pendingHref;
  }

  // ---------- Imágenes hero ----------

  async function handleHeroImageSelected(index: number, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const url = await subirImagen(file, 'home');
      setHeroImages((prev) => prev.map((h, i) => (i === index ? url : h)));
      markDirty();
    } catch (error) {
      mostrarError((error as Error).message);
    }
  }

  function removeHeroImage(index: number) {
    setHeroImages((prev) => prev.map((h, i) => (i === index ? null : h)));
    markDirty();
  }

  // ---------- Secciones y banners ----------

  function addSection() {
    const id = genId();
    setItems((prev) => [...prev, { id, type: 'section', title: '', visible: true, open: true, products: [], isNew: true }]);
    setEditingItemId(id);
    setTitleDraft('');
  }

  function addBanner() {
    const id = genId();
    setItems((prev) => [...prev, { id, type: 'banner', visible: true, open: true, link: '', image: null }]);
    markDirty();
  }

  function startEditTitle(item: HomeSectionItem) {
    setEditingItemId(item.id);
    setTitleDraft(item.title);
  }

  function commitTitle() {
    if (!editingItemId) return;
    const draft = titleDraft.trim();
    if (draft) {
      setItems((prev) => prev.map((it) => (it.id === editingItemId && it.type === 'section' ? { ...it, title: draft, isNew: false } : it)));
      markDirty();
    } else {
      setItems((prev) => prev.filter((it) => !(it.id === editingItemId && it.type === 'section' && it.isNew)));
    }
    setEditingItemId(null);
  }

  function toggleItemOpen(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, open: !it.open } : it)));
  }

  function toggleItemVisible(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, visible: !it.visible } : it)));
    markDirty();
  }

  function updateBannerLink(id: string, value: string) {
    setItems((prev) => prev.map((it) => (it.id === id && it.type === 'banner' ? { ...it, link: value } : it)));
    markDirty();
  }

  async function handleBannerImageSelected(id: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const url = await subirImagen(file, 'home');
      setItems((prev) => prev.map((it) => (it.id === id && it.type === 'banner' ? { ...it, image: url } : it)));
      markDirty();
    } catch (error) {
      mostrarError((error as Error).message);
    }
  }

  function removeBannerImage(id: string) {
    setItems((prev) => prev.map((it) => (it.id === id && it.type === 'banner' ? { ...it, image: null } : it)));
    markDirty();
  }

  function confirmDeleteItem() {
    if (delConfirmIndex < 0) return;
    setItems((prev) => prev.filter((_, i) => i !== delConfirmIndex));
    markDirty();
    setDelConfirmIndex(-1);
  }

  // ---------- Productos dentro de una sección ----------

  function openPicker(item: HomeSectionItem) {
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, open: true } : it)));
    setPicker({ itemId: item.id, title: item.title });
    setPickerQuery('');
  }

  function addProductToSection(itemId: string, productId: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId && it.type === 'section' && !it.products.includes(productId)
          ? { ...it, products: [...it.products, productId] }
          : it
      )
    );
    markDirty();
  }

  function removeProductFromSection(itemId: string, index: number) {
    setItems((prev) => prev.map((it) => (it.id === itemId && it.type === 'section' ? { ...it, products: it.products.filter((_, i) => i !== index) } : it)));
    markDirty();
  }

  function dropProduct(itemId: string, toIndex: number) {
    const drag = dragProduct.current;
    if (drag && drag.itemId === itemId && drag.from !== toIndex) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== itemId || it.type !== 'section') return it;
          const products = [...it.products];
          const [moved] = products.splice(drag.from, 1);
          products.splice(toIndex, 0, moved);
          return { ...it, products };
        })
      );
      markDirty();
    }
    dragProduct.current = null;
    setOverProduct(null);
  }

  // ---------- Drag & drop de items (secciones + banners) ----------

  function dropItemAt(toIndex: number) {
    const drag = dragItem.current;
    if (drag && drag.from !== toIndex) {
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(drag.from, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      markDirty();
    }
    dragItem.current = null;
    setOverItemIndex(null);
  }

  // ---------- Guardado ----------

  function requestSaveConfirm() {
    const hasEmpty = items.some((it) => it.type === 'section' && !it.title.trim());
    if (hasEmpty) {
      setShowValidation(true);
      mostrarError('Completa los títulos vacíos antes de guardar');
      return;
    }
    setShowValidation(false);
    setShowErrorToast(false);
    setSaveConfirmOpen(true);
  }

  /**
   * SPEC-904 REQ-970, REQ-971, REQ-973.
   *
   * Hasta `BZ-81` esta función no enviaba nada: mostraba el toast de éxito y
   * limpiaba el estado sucio. El panel afirmaba haber guardado y además apagaba
   * el guardia de navegación, así que nadie se enteraba hasta recargar.
   *
   * Ahora el orden es al revés y no es negociable: **primero la confirmación
   * del servidor, después el toast**. Si algo falla, el estado sigue sucio y lo
   * que el administrador escribió sigue en memoria, listo para reintentar.
   */
  async function confirmSaveChanges() {
    setSaveConfirmOpen(false);
    setGuardando(true);
    try {
      await guardarInicio(items, heroImages);

      clearTimeout(savedToastTimer.current);
      setShowSavedToast(true);
      setDirty(false);
      savedToastTimer.current = setTimeout(() => setShowSavedToast(false), 2200);
    } catch (error) {
      mostrarError((error as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  // REQ-974 — la sección guarda ids; el nombre se resuelve solo para pintar.
  const nombrePorId = new Map(allProducts.map((p) => [p.id, p.name]));

  const sectionsOnly = items.filter((it) => it.type === 'section');
  const deletingItem = delConfirmIndex >= 0 ? items[delConfirmIndex] : null;
  const pickerItem = picker ? (items.find((it) => it.id === picker.itemId) as HomeSectionItem | undefined) : undefined;
  const pickerResults = pickerItem ? allProducts.filter((p) => p.name.toLowerCase().includes(pickerQuery.toLowerCase())) : [];

  return {
    items,
    heroImages,
    heroImagesOpen,
    setHeroImagesOpen,
    dirty,
    showValidation,
    showErrorToast,
    errorMensaje,
    saveConfirmOpen,
    setSaveConfirmOpen,
    showSavedToast,
    guardando,
    setDelConfirmIndex,
    editingItemId,
    titleDraft,
    setTitleDraft,
    picker,
    setPicker,
    pickerQuery,
    setPickerQuery,
    navConfirmOpen,
    setNavConfirmOpen,
    setPendingHref,
    dragItem,
    overItemIndex,
    setOverItemIndex,
    dragProduct,
    overProduct,
    setOverProduct,
    confirmNavigate,
    handleHeroImageSelected,
    removeHeroImage,
    addSection,
    addBanner,
    startEditTitle,
    commitTitle,
    toggleItemOpen,
    toggleItemVisible,
    updateBannerLink,
    handleBannerImageSelected,
    removeBannerImage,
    confirmDeleteItem,
    openPicker,
    addProductToSection,
    removeProductFromSection,
    dropProduct,
    dropItemAt,
    requestSaveConfirm,
    confirmSaveChanges,
    nombrePorId,
    sectionsOnly,
    deletingItem,
    pickerItem,
    pickerResults,
  };
}

export type InicioAdminModel = ReturnType<typeof useInicioAdminModel>;

export default function InicioAdmin(props: Props) {
  return <InicioAdminView view={useInicioAdminModel(props)} />;
}
