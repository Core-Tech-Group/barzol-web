import { useEffect, useMemo, useState } from 'react';
import type { ProductsAdminModel } from './ProductsAdmin';
import { PAGE_SIZE, TODAS_LAS_CATEGORIAS } from './productsAdminModel';
import { guardarOrden, modoListado, moverAIndice, ordenarParaAdmin } from './ordenAdmin';
import { cambiosDeOrden, compararPorOrden } from '@shared/lib/productos/ordenProducto';

export function useProductOrder(view: ProductsAdminModel) {
  const { activeCat, query, filtered, products, setProducts, editIndex } = view;
  const enabled = modoListado(activeCat === TODAS_LAS_CATEGORIAS ? null : activeCat, query) === 'reordenar';
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const baseline = useMemo(() => ordenarParaAdmin(filtered, enabled ? 'reordenar' : 'recientes').items, [filtered, enabled]);
  const draft = enabled ? drafts[activeCat] : undefined;
  const rows = draft
    ? draft.map((id) => baseline.find((p) => p.id === id)).filter((p): p is typeof baseline[number] => Boolean(p))
    : baseline;
  const pageItems = enabled ? rows : rows.slice(view.pageStart, view.pageStart + PAGE_SIZE);
  const dirty = Boolean(draft && draft.some((id, i) => id !== baseline[i]?.id));
  const anyDirty = Object.entries(drafts).some(([category, ids]) => {
    const current = products.filter((p) => p.category === category).sort(compararPorOrden);
    return ids.some((id, i) => id !== current[i]?.id);
  });

  useEffect(() => {
    window.__adminHasUnsavedChanges = anyDirty || editIndex !== null;
  }, [anyDirty, editIndex]);

  function move(from: number, position: number) {
    if (!enabled) return;
    setDrafts((old) => ({ ...old, [activeCat]: moverAIndice(rows.map((p) => p.id), from, position) }));
    setMessage('');
  }

  async function save() {
    if (!enabled || !dirty) return;
    const changes = cambiosDeOrden(rows);
    setSaving(true);
    setMessage('');
    try {
      await guardarOrden(changes);
      const posiciones = new Map(rows.map((p, i) => [p.id, i]));
      setProducts((old) => old.map((p) => posiciones.has(p.id) ? { ...p, orden: posiciones.get(p.id)! } : p));
      setDrafts((old) => { const next = { ...old }; delete next[activeCat]; return next; });
      setMessage('Orden guardado.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return { enabled, rows, pageItems, dirty, anyDirty, saving, message, move, save };
}
