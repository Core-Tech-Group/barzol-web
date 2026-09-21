import { useEffect, useRef, useState } from 'react';
import { queueSuccessMessage, consumeSuccessMessage } from '@admin/shared/successMessage';
import type { ApiResponse } from '@shared/api/apiResponse';

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

import CategoriesAdminView from './CategoriesAdminView';

export function useCategoriesAdminModel({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CatState[]>(() => initialCategories.map((c) => ({ ...c, open: true, subs: c.subs.map((s) => ({ ...s })) })));

  const [dirty, setDirty] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMsg, setErrorToastMsg] = useState('Completa los nombres vacíos antes de guardar');
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opsDone, setOpsDone] = useState(0);

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
      setErrorToastMsg('Completa los nombres vacíos antes de guardar');
      setShowErrorToast(true);
      errorToastTimer.current = setTimeout(() => setShowErrorToast(false), 2800);
      return;
    }
    setShowValidation(false);
    setShowErrorToast(false);
    setSaveConfirmOpen(true);
  }

  async function apiCall<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (!res.ok || !json.success) throw new Error(json.message || 'Error al guardar categorías.');
    setOpsDone((n) => n + 1);
    return json.data as T;
  }

  async function confirmSaveChanges() {
    setSaveConfirmOpen(false);
    setSaving(true);
    setOpsDone(0);
    try {
      // "¿es nueva?" se decide comparando contra initialCategories (la lista
      // que vino del servidor, nunca se modifica) — NO contra la bandera
      // `isNew` de cada fila: el editor de nombre inline (commitCatName /
      // commitSubName, ya existía antes de este CRUD) la apaga apenas se
      // termina de escribir el nombre, mucho antes de que la fila se guarde
      // de verdad. Confiar en esa bandera mandaba un PUT a un id
      // "new-<timestamp>-<n>" que nunca existió en la base.
      const initialCatIds = new Set(initialCategories.map((c) => c.id));
      const initialSubIds = new Set(initialCategories.flatMap((c) => c.subs.map((s) => s.id)));

      // 1) Categorías raíz: crear las nuevas primero (necesitamos su id real
      // para poder crear subcategorías que le apunten como padre) y
      // actualizar SOLO las existentes que realmente cambiaron (nombre u
      // orden) — no todas, para no tocar (ni mandar `updated_at`) filas que
      // el usuario ni siquiera abrió.
      const realIdOf = new Map<string, string>();
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        if (!initialCatIds.has(cat.id)) {
          const created = await apiCall<{ id: string }>('/api/categorias', 'POST', { nombre: cat.name, parentId: null, orden: i });
          realIdOf.set(cat.id, created.id);
        } else {
          realIdOf.set(cat.id, cat.id);
          const beforeIndex = initialCategories.findIndex((c) => c.id === cat.id);
          const before = initialCategories[beforeIndex];
          const changed = before.name !== cat.name || beforeIndex !== i;
          if (changed) {
            await apiCall(`/api/categorias/${cat.id}`, 'PUT', { nombre: cat.name, parentId: null, orden: i });
          }
        }
      }

      // 2) Categorías eliminadas (las que ya no están en el estado actual).
      const currentCatIds = new Set(categories.filter((c) => initialCatIds.has(c.id)).map((c) => c.id));
      for (const before of initialCategories) {
        if (!currentCatIds.has(before.id)) {
          await apiCall(`/api/categorias/${before.id}`, 'DELETE');
        }
      }

      // 3) Subcategorías: crear/actualizar (usando el id REAL del padre) solo
      // las que cambiaron de nombre, orden o categoría padre.
      for (const cat of categories) {
        const parentRealId = realIdOf.get(cat.id)!;
        for (let j = 0; j < cat.subs.length; j++) {
          const sub = cat.subs[j];
          if (!initialSubIds.has(sub.id)) {
            await apiCall('/api/categorias', 'POST', { nombre: sub.name, parentId: parentRealId, orden: j });
          } else {
            const beforeParent = initialCategories.find((c) => c.subs.some((s) => s.id === sub.id))!;
            const beforeIndex = beforeParent.subs.findIndex((s) => s.id === sub.id);
            const before = beforeParent.subs[beforeIndex];
            const changed = before.name !== sub.name || beforeIndex !== j || beforeParent.id !== cat.id;
            if (changed) {
              await apiCall(`/api/categorias/${sub.id}`, 'PUT', { nombre: sub.name, parentId: parentRealId, orden: j });
            }
          }
        }
      }

      // 4) Subcategorías eliminadas.
      const currentSubIds = new Set(categories.flatMap((c) => c.subs.filter((s) => initialSubIds.has(s.id)).map((s) => s.id)));
      for (const before of initialCategories) {
        for (const sub of before.subs) {
          if (!currentSubIds.has(sub.id)) {
            await apiCall(`/api/categorias/${sub.id}`, 'DELETE');
          }
        }
      }

      window.__adminHasUnsavedChanges = false;
      queueSuccessMessage('Categorías guardadas exitosamente');
      window.location.reload();
    } catch (e) {
      setSaving(false);
      clearTimeout(errorToastTimer.current);
      setErrorToastMsg((e as Error).message);
      setShowErrorToast(true);
      errorToastTimer.current = setTimeout(() => setShowErrorToast(false), 3600);
    }
  }

  return {
    categories,
    dirty,
    showValidation,
    showErrorToast,
    errorToastMsg,
    saveConfirmOpen,
    setSaveConfirmOpen,
    saving,
    opsDone,
    delConfirmIndex,
    setDelConfirmIndex,
    subDelConfirm,
    setSubDelConfirm,
    editingCatId,
    catNameDraft,
    setCatNameDraft,
    editingSubId,
    subNameDraft,
    setSubNameDraft,
    navConfirmOpen,
    setNavConfirmOpen,
    setPendingHref,
    dragCat,
    overCatIndex,
    setOverCatIndex,
    dragSub,
    overSub,
    setOverSub,
    successMsg,
    confirmNavigate,
    addCategory,
    startEditCatName,
    commitCatName,
    toggleCatOpen,
    confirmDelete,
    addSub,
    startEditSubName,
    commitSubName,
    confirmSubDelete,
    dropCat,
    dropSub,
    requestSaveConfirm,
    confirmSaveChanges,
  };
}

export type CategoriesAdminModel = ReturnType<typeof useCategoriesAdminModel>;

export default function CategoriesAdmin(props: Props) {
  return <CategoriesAdminView view={useCategoriesAdminModel(props)} />;
}
