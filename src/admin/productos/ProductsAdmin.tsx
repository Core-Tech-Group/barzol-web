import { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmModal from '@admin/shared/ConfirmModal.tsx';
import Toast from '@admin/shared/Toast.tsx';
import SavingOverlay from '@admin/shared/SavingOverlay.tsx';
import { queueSuccessMessage, consumeSuccessMessage } from '@admin/shared/successMessage';
import type { ApiResponse } from '@shared/api/apiResponse';

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
}

interface EditDraft {
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

interface Props {
  initialProducts: AdminProduct[];
  categories: string[]; // incluye 'Todas' como primer elemento
  instrumentsByCategory: Record<string, string[]>;
  vendors: string[];
}

const PAGE_SIZE = 10;
const EMPTY_PHOTOS: (string | null)[] = [null, null, null, null, null];

function emptyDraft(category: string, instrumentsByCategory: Record<string, string[]>, vendor: string): EditDraft {
  return {
    name: '',
    category,
    instrument: (instrumentsByCategory[category] || [])[0] || '',
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

function draftFromProduct(p: AdminProduct): EditDraft {
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

// ---------- Iconos ----------

function Icon({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

// ---------- Componente principal ----------

export default function ProductsAdmin({ initialProducts, categories, instrumentsByCategory, vendors }: Props) {
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('Todas');
  const [page, setPage] = useState(1);

  // null = cerrado, -1 = creando nuevo, >=0 = editando products[index]
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  // Vista previa local del archivo elegido (blob: URL, solo para mostrar en
  // esta sesión de edición) — lo que se guarda de verdad es el nombre del
  // archivo (editDraft.photos[i]), nunca el contenido en base64.
  const [photoPreviews, setPhotoPreviews] = useState<Record<number, string>>({});
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
      .filter((p) => (activeCat === 'Todas' || p.category === activeCat) && (!q || p.name.toLowerCase().includes(q)));
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
  }

  function openEdit(i: number) {
    resetPhotoPreviews();
    setEditDraft(draftFromProduct(products[i]));
    setEditIndex(i);
    setShowValidation(false);
  }

  function openNewProduct() {
    resetPhotoPreviews();
    const firstCat = categories.find((c) => c !== 'Todas') || '';
    setEditDraft(emptyDraft(firstCat, instrumentsByCategory, vendors[0] || 'BARZOL'));
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

  function draftToWriteInput(draft: EditDraft, cleanFeatures: string[]) {
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

  async function saveEdit() {
    if (!editDraft) return;
    const needsPhoto = editDraft.statusLabel === 'Publicado' && editDraft.active;
    const hasPhoto = editDraft.photos.some(Boolean);
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
    const payload = draftToWriteInput(editDraft, cleanFeatures);
    const isNew = editIndex === -1;
    const url = isNew ? '/api/productos' : `/api/productos/${products[editIndex as number].id}`;

    setSaving(true);
    setSavingMessage('Guardando producto...');
    try {
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

  // ---------- Fotos: se elige el archivo del escritorio (para que el admin
  // vea una vista previa real), pero lo que se guarda es solo el NOMBRE del
  // archivo — nunca el contenido en base64. Eso es lo que volvía pesado cada
  // guardado; se resuelve del todo recién cuando se conecte R2 (ahí este
  // nombre se reemplaza por la URL real que devuelva la subida). ----------

  function handlePhotoFile(index: number, file: File | null) {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreviews((prev) => {
      const old = prev[index];
      if (old) URL.revokeObjectURL(old);
      return { ...prev, [index]: previewUrl };
    });
    setEditDraft((d) => {
      if (!d) return d;
      const photos = [...d.photos];
      photos[index] = file.name;
      return { ...d, photos };
    });
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
    setEditDraft((d) => {
      if (!d) return d;
      const photos = [...d.photos];
      [photos[a], photos[b]] = [photos[b], photos[a]];
      return { ...d, photos };
    });
  }

  // ---------- Características: drag & drop nativo ----------

  function addFeature() {
    setEditDraft((d) => (d ? { ...d, features: [...d.features, ''] } : d));
  }
  function updateFeature(i: number, value: string) {
    setEditDraft((d) => {
      if (!d) return d;
      const features = [...d.features];
      features[i] = value;
      return { ...d, features };
    });
  }
  function removeFeature(i: number) {
    setEditDraft((d) => (d ? { ...d, features: d.features.filter((_, idx) => idx !== i) } : d));
  }
  function reorderFeature(from: number, to: number) {
    setEditDraft((d) => {
      if (!d) return d;
      const features = [...d.features];
      const [moved] = features.splice(from, 1);
      features.splice(to, 0, moved);
      return { ...d, features };
    });
  }

  if (!editDraft && editIndex !== null) return null; // safety guard, no debería pasar

  const catOptions = categories.filter((c) => c !== 'Todas');
  const filteredCatOptions = catOptions.filter((c) => c.toLowerCase().includes(catSearchQuery.toLowerCase()));
  const subOptions = editDraft ? instrumentsByCategory[editDraft.category] || [] : [];

  return (
    <>
      {/* TOP BAR */}
      <div
        className="bz-topbar"
        style={{
          height: 68,
          background: 'white',
          borderBottom: '1px solid var(--color-border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button
            type="button"
            className="bz-hamburger-btn"
            onClick={() => document.dispatchEvent(new CustomEvent('admin:toggle-sidebar'))}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              flexShrink: 0,
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <Icon size={18}>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="var(--color-text)" strokeWidth="1.8" strokeLinecap="round" />
            </Icon>
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Productos</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{products.length} productos en el catálogo</div>
          </div>
        </div>
        <button
          type="button"
          onClick={openNewProduct}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--color-primary)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          <Icon>
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </Icon>
          Nuevo producto
        </button>
      </div>

      {/* CONTENT */}
      <div className="bz-content-pad" style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        {/* FILTERS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, minWidth: 0 }}>
          <div style={{ position: 'relative', flex: '0 0 260px' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <Icon>
                <circle cx="11" cy="11" r="8" stroke="var(--color-text-faint)" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" />
              </Icon>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar producto..."
              style={{ width: '100%', padding: '9px 12px 9px 36px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)', background: 'white' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0, overflowX: 'auto', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
            {categories.map((c) => {
              const isActive = activeCat === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setActiveCat(c);
                    setPage(1);
                  }}
                  style={{
                    flexShrink: 0,
                    padding: '8px 15px',
                    borderRadius: 8,
                    border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: isActive ? 'var(--color-primary)' : 'white',
                    color: isActive ? 'white' : 'var(--color-text-soft)',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* TABLE */}
        <div style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.6fr 1.1fr 1fr 0.8fr 90px', gap: 12, padding: '13px 20px', background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border-soft)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Producto</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Categoría</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Precio</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Estado</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</span>
          </div>

          {pageItems.map((p) => (
            <div
              key={p.id}
              style={{ display: 'grid', gridTemplateColumns: '2.6fr 1.1fr 1fr 0.8fr 90px', gap: 12, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--color-border-faint)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-surface-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {p.photos[0] ? (
                    <img src={p.photos[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Icon size={18}>
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--color-text-faint)" strokeWidth="1.5" />
                      <circle cx="8.5" cy="8.5" r="1.5" stroke="var(--color-text-faint)" strokeWidth="1.5" />
                      <path d="M21 15l-5-5L5 21" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinejoin="round" />
                    </Icon>
                  )}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || 'Sin nombre'}</span>
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.category}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>S/ {p.price}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 600,
                    background: p.statusLabel === 'Publicado' ? 'var(--color-success-soft-bg)' : 'var(--color-orange-bg)',
                    color: p.statusLabel === 'Publicado' ? 'var(--color-success)' : 'var(--color-orange)',
                    width: 'fit-content',
                  }}
                >
                  {p.statusLabel}
                </span>
                <button
                  type="button"
                  onClick={() => toggleActive(p._i)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 600,
                    background: p.active ? 'var(--color-primary-light)' : 'var(--color-surface-muted)',
                    color: p.active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    width: 'fit-content',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {p.active ? 'Activo' : 'Inactivo'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => openEdit(p._i)}
                  title="Editar"
                  style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  <Icon>
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </Icon>
                </button>
                <button
                  type="button"
                  onClick={() => setDupConfirmIndex(p._i)}
                  title="Duplicar producto"
                  style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  <Icon>
                    <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.7" />
                  </Icon>
                </button>
                <button
                  type="button"
                  onClick={() => setDelConfirmIndex(p._i)}
                  title="Eliminar"
                  style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  <Icon>
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </Icon>
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13.5 }}>No se encontraron productos.</div>}

          {filtered.length > PAGE_SIZE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1.5px solid var(--color-border)', borderRadius: 7, cursor: 'pointer', color: safePage === 1 ? 'var(--color-border-muted)' : 'var(--color-text-soft)' }}
                >
                  <Icon size={14}>
                    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </Icon>
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    style={{
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: n === safePage ? 'var(--color-primary)' : 'white',
                      color: n === safePage ? 'white' : 'var(--color-text-soft)',
                      border: `1.5px solid ${n === safePage ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 7,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1.5px solid var(--color-border)', borderRadius: 7, cursor: 'pointer', color: safePage === totalPages ? 'var(--color-border-muted)' : 'var(--color-text-soft)' }}
                >
                  <Icon size={14}>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </Icon>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(saving || deleting) && <SavingOverlay message={deleting ? 'Eliminando producto...' : savingMessage} />}

      {successMsg && (
        <Toast
          message={successMsg}
          background="var(--color-success)"
          icon={
            <Icon size={16}>
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
        />
      )}

      {errorMsg && (
        <Toast
          message={errorMsg}
          background="var(--color-danger)"
          icon={
            <Icon size={16}>
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
              <path d="M12 8v5M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </Icon>
          }
        />
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
          title="Tienes una edición sin guardar"
          message="Si sales ahora, los cambios en este producto se perderán."
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

      {/* MODAL: CONFIRMAR ELIMINAR */}
      {delConfirmIndex >= 0 && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title="¿Eliminar este producto?"
          message={
            <>
              Se eliminará <strong style={{ color: 'var(--color-text-soft)' }}>"{products[delConfirmIndex]?.name}"</strong> permanentemente del catálogo. Esta acción no se puede deshacer.
            </>
          }
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          confirmBg="var(--color-danger)"
          confirmHoverBg="#b91c1c"
          onCancel={() => setDelConfirmIndex(-1)}
          onConfirm={confirmDelete}
        />
      )}

      {/* MODAL: CONFIRMAR DUPLICADO */}
      {dupConfirmIndex >= 0 && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <rect x="9" y="9" width="12" height="12" rx="2" stroke="var(--color-primary)" strokeWidth="1.8" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="var(--color-primary)" strokeWidth="1.8" />
            </Icon>
          }
          iconBg="var(--color-primary-light)"
          title="¿Duplicar este producto?"
          message={
            <>
              Se creará una copia de <strong style={{ color: 'var(--color-text-soft)' }}>"{products[dupConfirmIndex]?.name}"</strong> como borrador, lista para editar.
            </>
          }
          cancelLabel="Cancelar"
          confirmLabel="Duplicar"
          confirmBg="var(--color-primary)"
          confirmHoverBg="var(--color-primary-dark)"
          onCancel={() => setDupConfirmIndex(-1)}
          onConfirm={confirmDuplicate}
        />
      )}

      {/* MODAL: EDITAR / NUEVO PRODUCTO */}
      {editDraft && editIndex !== null && (
        <div onClick={closeEdit} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 880, maxHeight: '88vh', background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--color-border-faint)', flexShrink: 0 }}>
              <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)' }}>{editIndex === -1 ? 'Nuevo producto' : 'Editar producto'}</span>
              <button type="button" onClick={closeEdit} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-faint)' }}>
                <Icon size={16}>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </Icon>
              </button>
            </div>

            <div ref={modalScrollRef} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1, background: 'var(--color-bg)' }}>
              {/* SECCIÓN: Fotos */}
              <div id="edit-section-photos" style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>
                    Fotos del producto <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(hasta 5)</span>
                  </div>
                  <label
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', border: '1.5px dashed var(--color-border-muted)', borderRadius: 7, color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                  >
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => handlePhotosSelected(e.target.files)} />
                    <Icon size={12}>
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                    Subir fotos
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 12, rowGap: 16, flexWrap: 'wrap' }}>
                  {editDraft.photos.map((photo, i) => {
                    const preview = photoPreviews[i];
                    return (
                      <div
                        key={i}
                        draggable={!!photo}
                        onDragStart={() => {
                          if (photo) dragPhoto.current = { from: i };
                        }}
                        onDragEnter={(e) => {
                          if (dragPhoto.current) {
                            e.preventDefault();
                            setOverPhoto(i);
                          }
                        }}
                        onDragOver={(e) => {
                          if (dragPhoto.current) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragPhoto.current && dragPhoto.current.from !== i) {
                            swapPhotos(dragPhoto.current.from, i);
                          }
                          dragPhoto.current = null;
                          setOverPhoto(null);
                        }}
                        onDragEnd={() => {
                          dragPhoto.current = null;
                          setOverPhoto(null);
                        }}
                        style={{ width: 130, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: 130,
                            height: 100,
                            borderRadius: 8,
                            outline: overPhoto === i ? '2px solid var(--color-primary)' : 'none',
                            outlineOffset: 2,
                            cursor: photo ? 'grab' : 'default',
                            background: 'var(--color-surface-muted)',
                            overflow: 'hidden',
                          }}
                        >
                          {preview ? (
                            <label style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}>
                              <input type="file" accept="image/*" hidden onChange={(e) => handlePhotoFile(i, e.target.files?.[0] ?? null)} />
                              <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </label>
                          ) : photo ? (
                            <label style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 10.5, fontWeight: 600, textAlign: 'center', padding: 6, overflowWrap: 'anywhere' }}>
                              <input type="file" accept="image/*" hidden onChange={(e) => handlePhotoFile(i, e.target.files?.[0] ?? null)} />
                              {photo}
                            </label>
                          ) : (
                            <label style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: 10, textAlign: 'center', padding: 4 }}>
                              <input type="file" accept="image/*" hidden onChange={(e) => handlePhotoFile(i, e.target.files?.[0] ?? null)} />
                              {i === 0 ? 'Foto principal' : `Foto ${i + 1}`}
                            </label>
                          )}
                          <div style={{ position: 'absolute', top: 4, left: 4, width: 18, height: 18, borderRadius: 5, background: 'rgba(17,24,39,0.65)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            {i + 1}
                          </div>
                          {photo && (
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              title="Quitar foto"
                              style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 5, background: 'rgba(17,24,39,0.65)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            >
                              <Icon size={10}>
                                <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                              </Icon>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 10 }}>
                  La foto 1 es la principal. Arrastra las tarjetas para reordenar. Por ahora se guarda el nombre del archivo, no la imagen — la subida real se conecta más adelante con R2.
                </div>
                {showValidation && editDraft.statusLabel === 'Publicado' && editDraft.active && !editDraft.photos.some(Boolean) && (
                  <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600, marginTop: 4 }}>Un producto publicado y activo necesita al menos 1 foto</div>
                )}
              </div>

              {/* SECCIÓN: Información general */}
              <div style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>Información general</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: 12 }}>
                  <div>
                    <label id="edit-field-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                      Nombre del producto
                    </label>
                    <input
                      type="text"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                      style={{ width: '100%', padding: '10px 13px', border: showValidation && !editDraft.name.trim() ? '1.5px solid var(--color-danger)' : '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)' }}
                    />
                    {showValidation && !editDraft.name.trim() && <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600, marginTop: 4 }}>El nombre es obligatorio</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>Vendedor</label>
                    <select
                      value={editDraft.vendor}
                      onChange={(e) => setEditDraft((d) => (d ? { ...d, vendor: e.target.value } : d))}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)', background: 'white' }}
                    >
                      {vendors.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>Descripción</label>
                  <textarea
                    value={editDraft.description}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                    rows={3}
                    placeholder="Ej: Incorpora un mejor ángulo de inclinación, mayor versatilidad y una posición de lectura más cómoda para evitar distracciones."
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                    Palabras clave de búsqueda <span style={{ fontWeight: 400, color: 'var(--color-text-faint)' }}>(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={editDraft.keywords}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, keywords: e.target.value } : d))}
                    placeholder="Ej: soporte celular, atril, partitura, mute"
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)' }}
                  />
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', marginTop: 5 }}>Separadas por comas. Solo sinónimos o términos adicionales — no repitas el nombre del producto ni la categoría/subcategoría, esos ya se buscan automáticamente.</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 8 }}>Características</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {editDraft.features.map((feat, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={() => {
                          dragFeature.current = { from: i };
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragFeature.current) setOverFeature(i);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFeature.current && dragFeature.current.from !== i) {
                            reorderFeature(dragFeature.current.from, i);
                          }
                          dragFeature.current = null;
                          setOverFeature(null);
                        }}
                        onDragEnd={() => {
                          dragFeature.current = null;
                          setOverFeature(null);
                        }}
                        style={{ display: 'flex', gap: 6, alignItems: 'center', background: overFeature === i ? 'var(--color-primary-light)' : 'transparent', borderRadius: 7, transition: 'background 0.12s' }}
                      >
                        <div style={{ width: 16, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-text-faint)' }} title="Arrastrar para reordenar">
                          <svg width="9" height="15" viewBox="0 0 9 15" fill="currentColor">
                            <circle cx="1.6" cy="1.6" r="1.3" />
                            <circle cx="7.4" cy="1.6" r="1.3" />
                            <circle cx="1.6" cy="7.5" r="1.3" />
                            <circle cx="7.4" cy="7.5" r="1.3" />
                            <circle cx="1.6" cy="13.4" r="1.3" />
                            <circle cx="7.4" cy="13.4" r="1.3" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => updateFeature(i, e.target.value)}
                          style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(i)}
                          style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-faint)' }}
                        >
                          <Icon size={14}>
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </Icon>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addFeature}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', border: '1.5px dashed var(--color-border-muted)', borderRadius: 8, color: 'var(--color-text-muted)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Icon size={13}>
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </Icon>
                      Agregar característica
                    </button>
                  </div>
                </div>
              </div>

              {/* SECCIÓN: Categorización */}
              <div style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: 12 }}>Categorización</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                      Categoría <span style={{ fontWeight: 400, color: 'var(--color-text-faint)' }}>(instrumento)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDropdown((d) => (d === 'cat' ? null : 'cat'));
                        setCatSearchQuery('');
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', border: `1.5px solid ${openDropdown === 'cat' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)', background: 'white', cursor: 'pointer' }}
                    >
                      {editDraft.category}
                      <span style={{ flexShrink: 0, transform: openDropdown === 'cat' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.12s' }}>
                        <Icon size={13}>
                          <path d="M6 9l6 6 6-6" stroke="var(--color-text-faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </Icon>
                      </span>
                    </button>
                    {openDropdown === 'cat' && (
                      <>
                        <div onClick={() => setOpenDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.14)', zIndex: 10, overflow: 'hidden' }}>
                          <div style={{ padding: 8, borderBottom: '1px solid var(--color-border-faint)' }}>
                            <input
                              type="text"
                              autoFocus
                              value={catSearchQuery}
                              onChange={(e) => setCatSearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Buscar categoría..."
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 7, fontSize: 13, color: 'var(--color-text)' }}
                            />
                          </div>
                          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                            {filteredCatOptions.map((opt) => {
                              const isSelected = opt === editDraft.category;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    const insts = instrumentsByCategory[opt] || [];
                                    setEditDraft((d) => (d ? { ...d, category: opt, instrument: insts[0] || '' } : d));
                                    setOpenDropdown(null);
                                  }}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', border: 'none', background: isSelected ? 'var(--color-primary-light)' : 'white', color: isSelected ? 'var(--color-primary)' : 'var(--color-text)', fontSize: 13.5, fontWeight: isSelected ? 600 : 400, cursor: 'pointer', textAlign: 'left' }}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                            {filteredCatOptions.length === 0 && <div style={{ padding: '14px 13px', fontSize: 12.5, color: 'var(--color-text-faint)', textAlign: 'center' }}>Sin resultados</div>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                      Subcategoría <span style={{ fontWeight: 400, color: 'var(--color-text-faint)' }}>(accesorio)</span>
                    </label>
                    {subOptions.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown((d) => (d === 'sub' ? null : 'sub'))}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', border: `1.5px solid ${openDropdown === 'sub' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)', background: 'white', cursor: 'pointer' }}
                        >
                          {editDraft.instrument}
                          <span style={{ flexShrink: 0, transform: openDropdown === 'sub' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.12s' }}>
                            <Icon size={13}>
                              <path d="M6 9l6 6 6-6" stroke="var(--color-text-faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </Icon>
                          </span>
                        </button>
                        {openDropdown === 'sub' && (
                          <>
                            <div onClick={() => setOpenDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
                            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.14)', zIndex: 10, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                              {subOptions.map((opt) => {
                                const isSelected = opt === editDraft.instrument;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      setEditDraft((d) => (d ? { ...d, instrument: opt } : d));
                                      setOpenDropdown(null);
                                    }}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', border: 'none', background: isSelected ? 'var(--color-primary-light)' : 'white', color: isSelected ? 'var(--color-primary)' : 'var(--color-text)', fontSize: 13.5, fontWeight: isSelected ? 600 : 400, cursor: 'pointer', textAlign: 'left' }}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <input type="text" value="Sin subcategorías" disabled style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text-faint)', background: 'var(--color-surface-soft)' }} />
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '8px 12px', background: 'var(--color-primary-light)', borderRadius: 7 }}>
                  <Icon size={13}>
                    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="var(--color-primary)" strokeWidth="1.7" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="var(--color-primary)" strokeWidth="1.7" />
                    <path d="M3 17h7M6.5 13.5v7" stroke="var(--color-primary)" strokeWidth="1.7" strokeLinecap="round" />
                  </Icon>
                  <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
                    {editDraft.category || '—'}
                    {editDraft.instrument ? ` › ${editDraft.instrument}` : ''}
                  </span>
                </div>
              </div>

              {/* SECCIÓN: Precio */}
              <div style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: 12 }}>Precio</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label id="edit-field-price" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                      Precio (S/)
                    </label>
                    <input
                      type="text"
                      value={editDraft.price}
                      onChange={(e) => setEditDraft((d) => (d ? { ...d, price: e.target.value } : d))}
                      style={{ width: '100%', padding: '10px 13px', border: showValidation && !editDraft.price.trim() ? '1.5px solid var(--color-danger)' : '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)' }}
                    />
                    {showValidation && !editDraft.price.trim() && <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600, marginTop: 4 }}>El precio es obligatorio</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>Precio anterior (opcional)</label>
                    <input
                      type="text"
                      value={editDraft.originalPrice}
                      onChange={(e) => setEditDraft((d) => (d ? { ...d, originalPrice: e.target.value } : d))}
                      placeholder="Sin descuento"
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: Estado y visibilidad */}
              <div style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>Estado y visibilidad</div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 8 }}>Estado de publicación</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEditDraft((d) => (d ? { ...d, statusLabel: 'Publicado' } : d))}
                      style={{ flex: 1, padding: 9, borderRadius: 8, border: `1.5px solid ${editDraft.statusLabel === 'Publicado' ? 'var(--color-success)' : 'var(--color-border)'}`, background: editDraft.statusLabel === 'Publicado' ? 'var(--color-success-soft-bg)' : 'white', color: editDraft.statusLabel === 'Publicado' ? 'var(--color-success)' : 'var(--color-text-soft)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Publicado
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDraft((d) => (d ? { ...d, statusLabel: 'Borrador' } : d))}
                      style={{ flex: 1, padding: 9, borderRadius: 8, border: `1.5px solid ${editDraft.statusLabel === 'Borrador' ? 'var(--color-orange)' : 'var(--color-border)'}`, background: editDraft.statusLabel === 'Borrador' ? 'var(--color-orange-bg)' : 'white', color: editDraft.statusLabel === 'Borrador' ? 'var(--color-orange)' : 'var(--color-text-soft)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Borrador
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--color-surface-soft)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Producto activo</div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 1 }}>{editDraft.active ? 'Visible en la tienda' : 'Oculto en la tienda'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditDraft((d) => (d ? { ...d, active: !d.active } : d))}
                    style={{ position: 'relative', width: 42, height: 24, borderRadius: 99, background: editDraft.active ? 'var(--color-primary)' : 'var(--color-border)', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                  >
                    <span style={{ position: 'absolute', top: 2, left: editDraft.active ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left 0.15s' }} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--color-surface-soft)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Personalizable</div>
                    <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 1 }}>Nombre, logo o detalle especial bajo pedido</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditDraft((d) => (d ? { ...d, customizable: !d.customizable } : d))}
                    style={{ position: 'relative', width: 42, height: 24, borderRadius: 99, background: editDraft.customizable ? 'var(--color-primary)' : 'var(--color-border)', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
                  >
                    <span style={{ position: 'absolute', top: 2, left: editDraft.customizable ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left 0.15s' }} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '18px 22px', borderTop: '1px solid var(--color-border-faint)', flexShrink: 0 }}>
              <button type="button" onClick={closeEdit} disabled={saving} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-soft)', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                Cancelar
              </button>
              <button type="button" onClick={saveEdit} disabled={saving} style={{ flex: 1, padding: 11, borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: 'white', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.75 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
