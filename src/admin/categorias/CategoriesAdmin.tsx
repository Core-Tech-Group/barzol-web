import { useEffect, useRef, useState } from 'react';
import ConfirmModal from '@admin/shared/ConfirmModal.tsx';
import Toast from '@admin/shared/Toast.tsx';

export interface AdminSubcategory {
  id: string;
  name: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  subs: AdminSubcategory[];
}

interface Props {
  initialCategories: AdminCategory[];
}

interface CatState extends AdminCategory {
  open: boolean;
  isNew?: boolean;
  subs: (AdminSubcategory & { isNew?: boolean })[];
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

// ---------- Componente principal ----------

export default function CategoriesAdmin({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CatState[]>(() => initialCategories.map((c) => ({ ...c, open: true, subs: c.subs.map((s) => ({ ...s })) })));

  const [dirty, setDirty] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  const [delConfirmIndex, setDelConfirmIndex] = useState(-1);
  const [subDelConfirm, setSubDelConfirm] = useState<{ catId: string; subId: string; name: string } | null>(null);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catNameDraft, setCatNameDraft] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subNameDraft, setSubNameDraft] = useState('');

  const [navConfirmOpen, setNavConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const dragCat = useRef<{ from: number } | null>(null);
  const [overCatIndex, setOverCatIndex] = useState<number | null>(null);
  const dragSub = useRef<{ catId: string; from: number } | null>(null);
  const [overSub, setOverSub] = useState<{ catId: string; index: number } | null>(null);

  const idSeq = useRef(0);
  function genId() {
    idSeq.current += 1;
    return 'new-' + Date.now() + '-' + idSeq.current;
  }

  const errorToastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedToastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Puente con el sidebar (fuera de esta isla): mientras haya cambios sin
  // guardar avisamos vía window global para que AdminLayout intercepte los
  // clicks de navegación y nos deje decidir.
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
    if (!editingCatId) return;
    const el = document.querySelector<HTMLInputElement>(`[data-cat-edit-input="${editingCatId}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, [editingCatId]);

  function markDirty() {
    setDirty(true);
  }

  function confirmNavigate() {
    window.__adminHasUnsavedChanges = false;
    if (pendingHref) window.location.href = pendingHref;
  }

  // ---------- Categorías ----------

  function addCategory() {
    const id = genId();
    setCategories((prev) => [...prev, { id, name: '', open: true, subs: [], isNew: true }]);
    setEditingCatId(id);
    setCatNameDraft('');
  }

  function startEditCatName(cat: CatState) {
    setEditingCatId(cat.id);
    setCatNameDraft(cat.name);
  }

  function commitCatName() {
    if (!editingCatId) return;
    const draft = catNameDraft.trim();
    if (draft) {
      setCategories((prev) => prev.map((c) => (c.id === editingCatId ? { ...c, name: draft, isNew: false } : c)));
      markDirty();
    } else {
      setCategories((prev) => prev.filter((c) => !(c.id === editingCatId && c.isNew)));
    }
    setEditingCatId(null);
  }

  function toggleCatOpen(catId: string) {
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, open: !c.open } : c)));
  }

  function confirmDelete() {
    if (delConfirmIndex < 0) return;
    setCategories((prev) => prev.filter((_, i) => i !== delConfirmIndex));
    markDirty();
    setDelConfirmIndex(-1);
  }

  // ---------- Subcategorías ----------

  function addSub(catId: string) {
    const id = genId();
    setCategories((prev) => prev.map((c) => (c.id === catId ? { ...c, open: true, subs: [...c.subs, { id, name: '', isNew: true }] } : c)));
    setEditingSubId(id);
    setSubNameDraft('');
  }

  function startEditSubName(sub: AdminSubcategory) {
    setEditingSubId(sub.id);
    setSubNameDraft(sub.name);
  }

  function commitSubName() {
    if (!editingSubId) return;
    const draft = subNameDraft.trim();
    setCategories((prev) =>
      prev.map((c) => {
        if (!c.subs.some((s) => s.id === editingSubId)) return c;
        if (draft) {
          return { ...c, subs: c.subs.map((s) => (s.id === editingSubId ? { ...s, name: draft, isNew: false } : s)) };
        }
        return { ...c, subs: c.subs.filter((s) => !(s.id === editingSubId && s.isNew)) };
      })
    );
    if (draft) markDirty();
    setEditingSubId(null);
  }

  function confirmSubDelete() {
    if (!subDelConfirm) return;
    setCategories((prev) => prev.map((c) => (c.id === subDelConfirm.catId ? { ...c, subs: c.subs.filter((s) => s.id !== subDelConfirm.subId) } : c)));
    markDirty();
    setSubDelConfirm(null);
  }

  // ---------- Drag & drop nativo ----------

  function dropCat(toIndex: number) {
    const drag = dragCat.current;
    if (drag && drag.from !== toIndex) {
      setCategories((prev) => {
        const next = [...prev];
        const [moved] = next.splice(drag.from, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      markDirty();
    }
    dragCat.current = null;
    setOverCatIndex(null);
  }

  function dropSub(catId: string, toIndex: number) {
    const drag = dragSub.current;
    if (drag && drag.catId === catId && drag.from !== toIndex) {
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== catId) return c;
          const subs = [...c.subs];
          const [moved] = subs.splice(drag.from, 1);
          subs.splice(toIndex, 0, moved);
          return { ...c, subs };
        })
      );
      markDirty();
    }
    dragSub.current = null;
    setOverSub(null);
  }

  // ---------- Guardado ----------

  function requestSaveConfirm() {
    const hasEmpty = categories.some((cat) => !cat.name.trim() || cat.subs.some((s) => !s.name.trim()));
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
    // TODO: reemplazar por @shared/lib/categorias/categoriaService cuando se conecte Supabase.
    clearTimeout(savedToastTimer.current);
    setSaveConfirmOpen(false);
    setShowSavedToast(true);
    setDirty(false);
    savedToastTimer.current = setTimeout(() => setShowSavedToast(false), 2200);
  }

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
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Categorías</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{categories.length} categorías</div>
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
              onClick={addCategory}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', color: 'var(--color-text-soft)', fontSize: 13, fontWeight: 600, border: '1.5px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
            >
              <Icon size={15}>
                <path d="M12 5v14M5 12h14" stroke="var(--color-text-soft)" strokeWidth="2" strokeLinecap="round" />
              </Icon>
              Nueva categoría
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
          message="Completa los nombres vacíos antes de guardar"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560, margin: '0 auto' }}>
          {categories.map((cat, i) => {
            const nameHasError = showValidation && !cat.name.trim();
            const hasSubs = cat.subs.length > 0;
            const showSubsSection = hasSubs && cat.open;
            return (
              <div
                key={cat.id}
                draggable
                onDragStart={() => {
                  dragCat.current = { from: i };
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragCat.current) setOverCatIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropCat(i);
                }}
                onDragEnd={() => {
                  dragCat.current = null;
                  setOverCatIndex(null);
                }}
                style={{ background: overCatIndex === i ? 'var(--color-primary-light)' : 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, overflow: 'hidden', transition: 'background 0.12s' }}
              >
                {/* Header de categoría */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border-faint)' }}>
                  <div style={{ width: 16, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-border-muted)' }} title="Arrastrar para reordenar">
                    <DragHandleIcon />
                  </div>
                  {hasSubs ? (
                    <button
                      type="button"
                      onClick={() => toggleCatOpen(cat.id)}
                      style={{ width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-muted)', transform: cat.open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                    >
                      <Icon size={14}>
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </Icon>
                    </button>
                  ) : (
                    <div style={{ width: 26, height: 26, flexShrink: 0 }} />
                  )}

                  {editingCatId === cat.id ? (
                    <input
                      type="text"
                      data-cat-edit-input={cat.id}
                      value={catNameDraft}
                      onChange={(e) => setCatNameDraft(e.target.value)}
                      onBlur={commitCatName}
                      autoFocus
                      placeholder="Nombre de la categoría"
                      style={{ flex: 1, padding: '7px 10px', border: '1.5px solid var(--color-primary)', borderRadius: 7, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}
                    />
                  ) : (
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: nameHasError ? 'var(--color-danger)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</div>
                      {nameHasError && <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600 }}>Falta el nombre de la categoría</div>}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => addSub(cat.id)}
                    title="Agregar subcategoría"
                    style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <Icon size={14}>
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </Icon>
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditCatName(cat)}
                    title="Editar"
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
                    title="Eliminar"
                    style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <Icon size={14}>
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </button>
                </div>

                {/* Subcategorías */}
                {showSubsSection && (
                  <div style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: 10 }}>Subcategorías</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, marginLeft: 26 }}>
                      {cat.subs.map((sub, j) => {
                        const subHasError = showValidation && !sub.name.trim();
                        const rowOver = overSub && overSub.catId === cat.id && overSub.index === j;
                        return (
                          <div
                            key={sub.id}
                            draggable
                            onDragStart={() => {
                              dragSub.current = { catId: cat.id, from: j };
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (dragSub.current && dragSub.current.catId === cat.id) setOverSub({ catId: cat.id, index: j });
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              dropSub(cat.id, j);
                            }}
                            onDragEnd={() => {
                              dragSub.current = null;
                              setOverSub(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: rowOver ? 'var(--color-primary-light)' : 'var(--color-surface-soft)', borderRadius: 8, transition: 'background 0.12s' }}
                          >
                            <div style={{ width: 16, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-border-muted)' }} title="Arrastrar para reordenar">
                              <DragHandleIcon />
                            </div>
                            {editingSubId === sub.id ? (
                              <input
                                type="text"
                                value={subNameDraft}
                                onChange={(e) => setSubNameDraft(e.target.value)}
                                onBlur={commitSubName}
                                autoFocus
                                placeholder="Nombre de la subcategoría"
                                style={{ flex: 1, padding: '6px 9px', border: '1.5px solid var(--color-primary)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}
                              />
                            ) : (
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: subHasError ? 'var(--color-danger)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name || 'Sin nombre'}</span>
                                {subHasError && <div style={{ fontSize: 10.5, color: 'var(--color-danger)', fontWeight: 600, marginTop: 1 }}>Falta el nombre</div>}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditSubName(sub)}
                              style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-faint)' }}
                            >
                              <Icon size={13}>
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                              </Icon>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubDelConfirm({ catId: cat.id, subId: sub.id, name: sub.name || 'esta subcategoría' })}
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
                      onClick={() => addSub(cat.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', border: '1.5px dashed var(--color-border-muted)', borderRadius: 8, color: 'var(--color-text-muted)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Icon size={13}>
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </Icon>
                      Agregar subcategoría
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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

      {/* MODAL: CONFIRMAR ELIMINAR CATEGORÍA */}
      {delConfirmIndex >= 0 && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title="¿Eliminar esta categoría?"
          message={
            <>
              Se eliminará <strong style={{ color: 'var(--color-text-soft)' }}>"{categories[delConfirmIndex]?.name}"</strong> junto con todas sus subcategorías. Esta acción no se puede deshacer.
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

      {/* MODAL: CONFIRMAR ELIMINAR SUBCATEGORÍA */}
      {subDelConfirm && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title="¿Eliminar esta subcategoría?"
          message={
            <>
              Se eliminará <strong style={{ color: 'var(--color-text-soft)' }}>"{subDelConfirm.name}"</strong>. Esta acción no se puede deshacer.
            </>
          }
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          confirmBg="var(--color-danger)"
          confirmHoverBg="#b91c1c"
          onCancel={() => setSubDelConfirm(null)}
          onConfirm={confirmSubDelete}
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
          message="Se actualizarán las categorías y subcategorías con los cambios realizados."
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
