import { useEffect, useRef, useState } from 'react';
import ConfirmModal from '@admin/shared/ConfirmModal.tsx';
import Toast from '@admin/shared/Toast.tsx';
import SavingOverlay from '@admin/shared/SavingOverlay.tsx';
import { queueSuccessMessage, consumeSuccessMessage } from '@admin/shared/successMessage';
import type { ApiResponse } from '@shared/api/apiResponse';

export interface GalleryPhoto {
  id: string;
  caption: string;
  image: string | null;
}

interface Props {
  title: string;
  saveConfirmMessage: string;
  initialPhotos: GalleryPhoto[];
  tipo: 'accesorios' | 'trabajos';
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

export default function GalleryAdmin({ title, saveConfirmMessage, initialPhotos, tipo }: Props) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos);

  const [dirty, setDirty] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMsg, setErrorToastMsg] = useState('Completa los títulos vacíos antes de guardar');
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opsDone, setOpsDone] = useState(0);
  // Vista previa local del archivo elegido (blob: URL, por id de foto) —
  // lo que se guarda de verdad es el nombre del archivo, no el contenido.
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});

  const [delConfirmIndex, setDelConfirmIndex] = useState(-1);

  const [navConfirmOpen, setNavConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const dragPhoto = useRef<{ from: number } | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const idSeq = useRef(0);
  function genId() {
    idSeq.current += 1;
    return 'new-' + Date.now() + '-' + idSeq.current;
  }

  const errorToastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  useEffect(() => {
    const msg = consumeSuccessMessage();
    if (msg) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  }, []);

  function markDirty() {
    setDirty(true);
  }

  function confirmNavigate() {
    window.__adminHasUnsavedChanges = false;
    if (pendingHref) window.location.href = pendingHref;
  }

  function addPhoto() {
    setPhotos((prev) => [...prev, { id: genId(), caption: '', image: null }]);
    markDirty();
  }

  function updateCaption(id: string, value: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption: value } : p)));
    markDirty();
  }

  // Se elige el archivo del escritorio (para que el admin vea una vista
  // previa real), pero lo que se guarda es solo el NOMBRE del archivo —
  // nunca el contenido en base64. Se resuelve del todo cuando se conecte R2
  // (ahí este nombre se reemplaza por la URL real que devuelva la subida).
  function handlePhotoFile(id: string, file: File | null) {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreviews((prev) => {
      const old = prev[id];
      if (old) URL.revokeObjectURL(old);
      return { ...prev, [id]: previewUrl };
    });
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, image: file.name } : p)));
    markDirty();
  }

  function confirmDeletePhoto() {
    if (delConfirmIndex < 0) return;
    const target = photos[delConfirmIndex];
    setPhotoPreviews((prev) => {
      const old = prev[target.id];
      if (old) URL.revokeObjectURL(old);
      const next = { ...prev };
      delete next[target.id];
      return next;
    });
    setPhotos((prev) => prev.filter((_, i) => i !== delConfirmIndex));
    markDirty();
    setDelConfirmIndex(-1);
  }

  function dropPhoto(toIndex: number) {
    const drag = dragPhoto.current;
    if (drag && drag.from !== toIndex) {
      setPhotos((prev) => {
        const next = [...prev];
        const [moved] = next.splice(drag.from, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      markDirty();
    }
    dragPhoto.current = null;
    setOverIndex(null);
  }

  function requestSaveConfirm() {
    const hasEmptyCaption = photos.some((p) => !p.caption.trim());
    const hasMissingImage = photos.some((p) => !p.image);
    clearTimeout(errorToastTimer.current);
    if (hasEmptyCaption || hasMissingImage) {
      setShowValidation(true);
      setErrorToastMsg(hasMissingImage ? 'Falta subir una foto en alguna tarjeta' : 'Completa los títulos vacíos antes de guardar');
      setShowErrorToast(true);
      errorToastTimer.current = setTimeout(() => setShowErrorToast(false), 2800);
      return;
    }
    setShowValidation(false);
    setShowErrorToast(false);
    setSaveConfirmOpen(true);
  }

  async function apiCall(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as ApiResponse<unknown>;
    if (!res.ok || !json.success) throw new Error(json.message || 'Error al guardar la galería.');
    setOpsDone((n) => n + 1);
    return json.data;
  }

  async function confirmSaveChanges() {
    setSaveConfirmOpen(false);
    setSaving(true);
    setOpsDone(0);
    try {
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const payload = { tipo, titulo: p.caption.trim(), imagenUrl: p.image, orden: i };
        if (p.id.startsWith('new-')) {
          await apiCall('/api/galeria', 'POST', payload);
        } else {
          await apiCall(`/api/galeria/${p.id}`, 'PUT', payload);
        }
      }

      const currentIds = new Set(photos.filter((p) => !p.id.startsWith('new-')).map((p) => p.id));
      for (const before of initialPhotos) {
        if (!currentIds.has(before.id)) {
          await apiCall(`/api/galeria/${before.id}`, 'DELETE');
        }
      }

      window.__adminHasUnsavedChanges = false;
      queueSuccessMessage('Galería guardada exitosamente');
      window.location.reload();
    } catch (e) {
      setSaving(false);
      clearTimeout(errorToastTimer.current);
      setErrorToastMsg((e as Error).message);
      setShowErrorToast(true);
      errorToastTimer.current = setTimeout(() => setShowErrorToast(false), 3600);
    }
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
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
            </div>
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
              onClick={addPhoto}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', color: 'var(--color-text-soft)', fontSize: 13, fontWeight: 600, border: '1.5px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
            >
              <Icon size={15}>
                <path d="M12 5v14M5 12h14" stroke="var(--color-text-soft)" strokeWidth="2" strokeLinecap="round" />
              </Icon>
              Agregar foto
            </button>
            <button
              type="button"
              onClick={requestSaveConfirm}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--color-primary)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              <Icon size={15}>
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M17 21v-8H7v8M7 3v5h8" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
              </Icon>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      {saving && (
        <SavingOverlay
          message="Guardando galería..."
          detail={opsDone > 0 ? `${opsDone} ${opsDone === 1 ? 'cambio guardado' : 'cambios guardados'}...` : undefined}
        />
      )}

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

      {showErrorToast && (
        <Toast
          message={errorToastMsg}
          background="var(--color-danger)"
          icon={
            <Icon size={16}>
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
              <path d="M12 8v5M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </Icon>
          }
        />
      )}
      {/* CONTENT */}
      <div className="bz-content-pad" style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', marginBottom: 16 }}>Arrastra una tarjeta para reordenar. El orden se refleja en la galería del sitio.</div>

          {photos.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-faint)', fontSize: 13.5 }}>Sin fotos todavía. Usa "Agregar foto" para empezar.</div>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {photos.map((p, i) => {
              const captionHasError = showValidation && !p.caption.trim();
              const isOver = overIndex === i;
              const preview = photoPreviews[p.id];
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => {
                    dragPhoto.current = { from: i };
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragPhoto.current) setOverIndex(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    dropPhoto(i);
                  }}
                  onDragEnd={() => {
                    dragPhoto.current = null;
                    setOverIndex(null);
                  }}
                  style={{ background: isOver ? 'var(--color-primary-light)' : 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, overflow: 'hidden', transition: 'background 0.12s' }}
                >
                  <div style={{ position: 'relative' }}>
                    {preview ? (
                      <label style={{ width: '100%', height: 170, display: 'block', cursor: 'pointer' }}>
                        <input type="file" accept="image/*" hidden onChange={(e) => handlePhotoFile(p.id, e.target.files?.[0] ?? null)} />
                        <img src={preview} alt="" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />
                      </label>
                    ) : p.image ? (
                      <label style={{ width: '100%', height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, textAlign: 'center', padding: 10, overflowWrap: 'anywhere' }}>
                        <input type="file" accept="image/*" hidden onChange={(e) => handlePhotoFile(p.id, e.target.files?.[0] ?? null)} />
                        {p.image}
                      </label>
                    ) : (
                      <label style={{ width: '100%', height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--color-surface-muted)', color: 'var(--color-text-faint)', fontSize: 12 }}>
                        <input type="file" accept="image/*" hidden onChange={(e) => handlePhotoFile(p.id, e.target.files?.[0] ?? null)} />
                        Subir foto
                      </label>
                    )}
                    <div
                      style={{ position: 'absolute', top: 8, left: 8, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,24,39,0.55)', borderRadius: 6, cursor: 'grab', color: 'white', pointerEvents: 'none' }}
                      title="Arrastrar para reordenar"
                    >
                      <DragHandleIcon />
                    </div>
                    <button
                      type="button"
                      onClick={() => setDelConfirmIndex(i)}
                      style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,24,39,0.55)', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'white' }}
                    >
                      <Icon size={13}>
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </Icon>
                    </button>
                  </div>
                  <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="text"
                      value={p.caption}
                      onChange={(e) => updateCaption(p.id, e.target.value)}
                      placeholder="Título del trabajo"
                      style={{ width: '100%', padding: '8px 10px', border: captionHasError ? '1.5px solid var(--color-danger)' : '1.5px solid var(--color-border)', borderRadius: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--color-text)' }}
                    />
                    {captionHasError && <div style={{ fontSize: 10.5, color: 'var(--color-danger)', fontWeight: 600, marginTop: 5 }}>Falta el título</div>}
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* MODAL: CONFIRMAR ELIMINAR FOTO */}
      {delConfirmIndex >= 0 && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title="¿Eliminar esta foto?"
          message="Se quitará de la galería del sitio. Esta acción no se puede deshacer."
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          confirmBg="var(--color-danger)"
          confirmHoverBg="#b91c1c"
          onCancel={() => setDelConfirmIndex(-1)}
          onConfirm={confirmDeletePhoto}
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
          message={saveConfirmMessage}
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
