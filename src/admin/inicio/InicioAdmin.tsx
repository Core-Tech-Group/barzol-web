import { useEffect, useRef, useState } from 'react';
import ConfirmModal from '@admin/shared/ConfirmModal.tsx';
import Toast from '@admin/shared/Toast.tsx';

export interface AllProduct {
  name: string;
  category: string;
}

export interface HomeSectionItem {
  id: string;
  type: 'section';
  title: string;
  visible: boolean;
  open: boolean;
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

function Icon({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
      <circle cx="2" cy="2" r="1.4" />
      <circle cx="8" cy="2" r="1.4" />
      <circle cx="2" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="2" cy="14" r="1.4" />
      <circle cx="8" cy="14" r="1.4" />
    </svg>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Componente principal ----------

export default function InicioAdmin({ initialItems, allProducts, initialHeroImages }: Props) {
  const [items, setItems] = useState<HomeItem[]>(initialItems);
  const [heroImages, setHeroImages] = useState<(string | null)[]>(initialHeroImages ?? [null, null, null]);
  const [heroImagesOpen, setHeroImagesOpen] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

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

  function confirmNavigate() {
    window.__adminHasUnsavedChanges = false;
    if (pendingHref) window.location.href = pendingHref;
  }

  // ---------- Imágenes hero ----------

  async function handleHeroImageSelected(index: number, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const url = await readFileAsDataURL(file);
    setHeroImages((prev) => prev.map((h, i) => (i === index ? url : h)));
    markDirty();
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
    const url = await readFileAsDataURL(file);
    setItems((prev) => prev.map((it) => (it.id === id && it.type === 'banner' ? { ...it, image: url } : it)));
    markDirty();
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

  function addProductToSection(itemId: string, name: string) {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId && it.type === 'section' && !it.products.includes(name) ? { ...it, products: [...it.products, name] } : it))
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
    clearTimeout(errorToastTimer.current);
    if (hasEmpty) {
      setShowValidation(true);
      setShowErrorToast(true);
      errorToastTimer.current = setTimeout(() => setShowErrorToast(false), 2800);
      return;
    }
    setShowValidation(false);
    setShowErrorToast(false);
    setSaveConfirmOpen(true);
  }

  function confirmSaveChanges() {
    // TODO: reemplazar por @shared/lib/home/homeService cuando se conecte Supabase.
    clearTimeout(savedToastTimer.current);
    setSaveConfirmOpen(false);
    setShowSavedToast(true);
    setDirty(false);
    savedToastTimer.current = setTimeout(() => setShowSavedToast(false), 2200);
  }

  const sectionsOnly = items.filter((it) => it.type === 'section');
  const deletingItem = delConfirmIndex >= 0 ? items[delConfirmIndex] : null;
  const pickerItem = picker ? (items.find((it) => it.id === picker.itemId) as HomeSectionItem | undefined) : undefined;
  const pickerResults = pickerItem ? allProducts.filter((p) => p.name.toLowerCase().includes(pickerQuery.toLowerCase())) : [];

  return (
    <>
      {/* TOP BAR */}
      <div
        className="bz-topbar"
        style={{ height: 68, background: 'white', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0, gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button
            type="button"
            className="bz-hamburger-btn"
            onClick={() => document.dispatchEvent(new CustomEvent('admin:toggle-sidebar'))}
            style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0, border: '1px solid var(--color-border)', borderRadius: 8, background: 'white', cursor: 'pointer' }}
          >
            <Icon size={18}>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="var(--color-text)" strokeWidth="1.8" strokeLinecap="round" />
            </Icon>
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Página de inicio</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sectionsOnly.length} secciones</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {dirty && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-danger)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-danger)', display: 'inline-block' }} />
              Cambios sin guardar
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={addSection}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', color: 'var(--color-text-soft)', fontSize: 13, fontWeight: 600, border: '1.5px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
            >
              <Icon size={15}>
                <path d="M12 5v14M5 12h14" stroke="var(--color-text-soft)" strokeWidth="2" strokeLinecap="round" />
              </Icon>
              Nuevo listado
            </button>
            <button
              type="button"
              onClick={addBanner}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', color: 'var(--color-text-soft)', fontSize: 13, fontWeight: 600, border: '1.5px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
            >
              <Icon size={15}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--color-text-soft)" strokeWidth="1.7" />
                <circle cx="8.5" cy="8.5" r="1.5" stroke="var(--color-text-soft)" strokeWidth="1.5" />
                <path d="M21 15l-5-5L5 21" stroke="var(--color-text-soft)" strokeWidth="1.5" strokeLinejoin="round" />
              </Icon>
              Agregar banner
            </button>
            <button
              type="button"
              onClick={requestSaveConfirm}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--color-primary)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              <Icon size={15}>
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
              </Icon>
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      {showErrorToast && (
        <Toast
          message="Completa los títulos vacíos antes de guardar"
          background="var(--color-danger)"
          icon={
            <Icon size={16}>
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
              <path d="M12 8v5M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </Icon>
          }
        />
      )}
      {showSavedToast && (
        <Toast
          message="Cambios guardados"
          background="#111827"
          icon={
            <Icon size={16}>
              <path d="M20 6L9 17l-5-5" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
        />
      )}

      {/* CONTENT */}
      <div className="bz-content-pad" style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820, margin: '0 auto' }}>
          {/* Imágenes del home */}
          <div style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', background: 'var(--color-surface-soft)', borderRadius: '12px 12px 0 0', borderBottom: heroImagesOpen ? '1px solid var(--color-border-faint)' : 'none' }}
            >
              <button
                type="button"
                onClick={() => setHeroImagesOpen((v) => !v)}
                style={{ width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-muted)', transform: heroImagesOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
              >
                <Icon size={14}>
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </Icon>
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>Imágenes del home</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', marginTop: 2 }}>Sube una imagen nueva sobre cada banner para reemplazarlo</div>
              </div>
            </div>
            {heroImagesOpen && (
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 8 }}>Banner principal (hero) — hasta 3 imágenes</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {heroImages.map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: '100%', height: 90, borderRadius: 10, overflow: 'hidden', background: 'var(--color-surface-muted)' }}>
                        {img ? (
                          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <label style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1.5px dashed var(--color-border-muted)', borderRadius: 10, color: 'var(--color-text-faint)', fontSize: 11, textAlign: 'center' }}>
                            <input type="file" accept="image/*" hidden onChange={(e) => handleHeroImageSelected(i, e.target.files)} />
                            {`Hero ${i + 1}`}
                          </label>
                        )}
                        {img && (
                          <button
                            type="button"
                            onClick={() => removeHeroImage(i)}
                            title="Quitar imagen"
                            style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 5, background: 'rgba(17,24,39,0.65)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >
                            <Icon size={11}>
                              <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                            </Icon>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  El banner secundario (1489 × 186 px) se administra como un banner más abajo, junto al listado de productos, para poder reordenarlo.
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 2px', marginTop: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>Secciones de productos y banners</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>Arrastra para reordenar</div>
          </div>

          {items.map((it, i) => {
            const isOver = overItemIndex === i;
            const dragHandlers = {
              draggable: true,
              onDragStart: () => {
                dragItem.current = { from: i };
              },
              onDragOver: (e: React.DragEvent) => {
                e.preventDefault();
                if (dragItem.current) setOverItemIndex(i);
              },
              onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                dropItemAt(i);
              },
              onDragEnd: () => {
                dragItem.current = null;
                setOverItemIndex(null);
              },
            };

            if (it.type === 'banner') {
              return (
                <div
                  key={it.id}
                  {...dragHandlers}
                  style={{ background: isOver ? 'var(--color-primary-light)' : 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, transition: 'background 0.12s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', background: 'var(--color-surface-soft)', borderRadius: '12px 12px 0 0', borderBottom: it.open ? '1px solid var(--color-border-faint)' : 'none' }}>
                    <div style={{ width: 16, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-border-muted)' }} title="Arrastrar para reordenar">
                      <DragHandleIcon />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleItemOpen(it.id)}
                      style={{ width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-muted)', transform: it.open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                    >
                      <Icon size={14}>
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </Icon>
                    </button>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>Banner de imagen</div>
                    <button
                      type="button"
                      onClick={() => toggleItemVisible(it.id)}
                      title="Mostrar/ocultar en el home"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: it.visible ? 'var(--color-success-soft-bg)' : 'var(--color-surface-muted)', color: it.visible ? 'var(--color-success)' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      {it.visible ? 'Visible' : 'Oculta'}
                    </button>
                    <div style={{ width: 30, height: 30, flexShrink: 0 }} />
                    <button
                      type="button"
                      onClick={() => setDelConfirmIndex(i)}
                      style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                    >
                      <Icon size={14}>
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </Icon>
                    </button>
                  </div>
                  {it.open && (
                    <div style={{ padding: '14px 18px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ position: 'relative', width: '100%', height: 150, borderRadius: 10, overflow: 'hidden', background: 'var(--color-surface-muted)' }}>
                        {it.image ? (
                          <img src={it.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <label style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1.5px dashed var(--color-border-muted)', borderRadius: 10, color: 'var(--color-text-faint)', fontSize: 12 }}>
                            <input type="file" accept="image/*" hidden onChange={(e) => handleBannerImageSelected(it.id, e.target.files)} />
                            Imagen del banner
                          </label>
                        )}
                        {it.image && (
                          <button
                            type="button"
                            onClick={() => removeBannerImage(it.id)}
                            title="Quitar imagen"
                            style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6, background: 'rgba(17,24,39,0.65)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >
                            <Icon size={12}>
                              <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                            </Icon>
                          </button>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                          Enlace del banner <span style={{ fontWeight: 400, color: 'var(--color-text-faint)' }}>(ruta interna, opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={it.link}
                          onChange={(e) => updateBannerLink(it.id, e.target.value)}
                          placeholder="Ej: /categoria/sordinas"
                          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const sec = it;
            const titleHasError = showValidation && !sec.title.trim();
            return (
              <div
                key={sec.id}
                {...dragHandlers}
                style={{ background: isOver ? 'var(--color-primary-light)' : 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, overflow: 'hidden', transition: 'background 0.12s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border-faint)' }}>
                  <div style={{ width: 16, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-border-muted)' }} title="Arrastrar para reordenar">
                    <DragHandleIcon />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleItemOpen(sec.id)}
                    style={{ width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-muted)', transform: sec.open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                  >
                    <Icon size={14}>
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </button>

                  {editingItemId === sec.id ? (
                    <input
                      type="text"
                      data-item-edit-input={sec.id}
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={commitTitle}
                      autoFocus
                      placeholder="Título de la sección"
                      style={{ flex: 1, padding: '7px 10px', border: '1.5px solid var(--color-primary)', borderRadius: 7, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}
                    />
                  ) : (
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: titleHasError ? 'var(--color-danger)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sec.title}</div>
                      {titleHasError ? (
                        <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600 }}>Falta el título</div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>{sec.products.length}{sec.products.length === 1 ? ' producto' : ' productos'}</div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleItemVisible(sec.id)}
                    title="Mostrar/ocultar en el home"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: sec.visible ? 'var(--color-success-soft-bg)' : 'var(--color-surface-muted)', color: sec.visible ? 'var(--color-success)' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    {sec.visible ? 'Visible' : 'Oculta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditTitle(sec)}
                    style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <Icon size={14}>
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDelConfirmIndex(i)}
                    style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <Icon size={14}>
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </button>
                </div>

                {sec.open && (
                  <div style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: 10 }}>Productos</div>
                    {sec.products.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', marginLeft: 26, marginBottom: 10 }}>Sin productos todavía.</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, marginLeft: 26 }}>
                      {sec.products.map((name, k) => {
                        const rowOver = overProduct && overProduct.itemId === sec.id && overProduct.index === k;
                        return (
                          <div
                            key={name + k}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              dragProduct.current = { itemId: sec.id, from: k };
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragProduct.current && dragProduct.current.itemId === sec.id) setOverProduct({ itemId: sec.id, index: k });
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              dropProduct(sec.id, k);
                            }}
                            onDragEnd={(e) => {
                              e.stopPropagation();
                              dragProduct.current = null;
                              setOverProduct(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: rowOver ? 'var(--color-primary-light)' : 'var(--color-surface-soft)', borderRadius: 8, transition: 'background 0.12s' }}
                          >
                            <div style={{ width: 16, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-border-muted)' }} title="Arrastrar para reordenar">
                              <DragHandleIcon />
                            </div>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                            <button
                              type="button"
                              onClick={() => removeProductFromSection(sec.id, k)}
                              style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-faint)' }}
                            >
                              <Icon size={13}>
                                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                              </Icon>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => openPicker(sec)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', border: '1.5px dashed var(--color-border-muted)', borderRadius: 8, color: 'var(--color-text-muted)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Icon size={13}>
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </Icon>
                      Agregar producto
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: AGREGAR PRODUCTO A SECCIÓN */}
      {picker && pickerItem && (
        <div onClick={() => setPicker(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 440, maxHeight: '78vh', background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '20px 22px 14px' }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>Agregar producto a "{pickerItem.title}"</div>
              <input
                type="text"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Buscar producto..."
                autoFocus
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)' }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
              {pickerResults.map((p) => {
                const added = pickerItem.products.includes(p.name);
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => addProductToSection(pickerItem.id, p.name)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', border: 'none', background: 'white', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>{p.category}</div>
                    </div>
                    {added ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-success)', flexShrink: 0 }}>Agregado</span>
                    ) : (
                      <Icon size={15}>
                        <path d="M12 5v14M5 12h14" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
                      </Icon>
                    )}
                  </button>
                );
              })}
              {pickerResults.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>Sin resultados</div>}
            </div>
            <div style={{ padding: '12px 22px 18px', borderTop: '1px solid var(--color-border-faint)' }}>
              <button type="button" onClick={() => setPicker(null)} style={{ width: '100%', padding: 10, border: 'none', background: 'transparent', color: 'var(--color-text-faint)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SALIR SIN GUARDAR */}
      {navConfirmOpen && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <circle cx="12" cy="12" r="9" stroke="var(--color-danger)" strokeWidth="1.8" />
              <path d="M12 8v5M12 16h.01" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title="Tienes cambios sin guardar"
          message="Si sales ahora, los cambios en esta página se perderán."
          cancelLabel="Seguir editando"
          confirmLabel="Salir sin guardar"
          confirmBg="var(--color-danger)"
          confirmHoverBg="#b91c1c"
          onCancel={() => {
            setNavConfirmOpen(false);
            setPendingHref(null);
          }}
          onConfirm={confirmNavigate}
        />
      )}

      {/* MODAL: CONFIRMAR ELIMINAR (sección o banner) */}
      {deletingItem && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title={deletingItem.type === 'banner' ? '¿Eliminar este banner?' : '¿Eliminar esta sección?'}
          message={
            deletingItem.type === 'banner' ? (
              'Se quitará esta imagen del home.'
            ) : (
              <>
                Se quitará <strong style={{ color: 'var(--color-text-soft)' }}>"{deletingItem.title}"</strong> del home. Los productos no se eliminan, solo dejan de mostrarse ahí.
              </>
            )
          }
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          confirmBg="var(--color-danger)"
          confirmHoverBg="#b91c1c"
          onCancel={() => setDelConfirmIndex(-1)}
          onConfirm={confirmDeleteItem}
        />
      )}

      {/* MODAL: CONFIRMAR GUARDAR */}
      {saveConfirmOpen && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M17 21v-8H7v8M7 3v5h8" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-primary-light)"
          title="¿Guardar los cambios?"
          message="Se actualizarán los listados de productos del home."
          cancelLabel="Cancelar"
          confirmLabel="Guardar"
          confirmBg="var(--color-primary)"
          confirmHoverBg="var(--color-primary-dark)"
          onCancel={() => setSaveConfirmOpen(false)}
          onConfirm={confirmSaveChanges}
        />
      )}
    </>
  );
}
