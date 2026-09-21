import type { Dispatch, SetStateAction } from 'react';
import type { EditDraft } from './productsAdminModel';

// Operaciones de la lista ordenable de características del formulario.
export function createFeatureActions(setEditDraft: Dispatch<SetStateAction<EditDraft | null>>) {
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
  return { addFeature, updateFeature, removeFeature, reorderFeature };
}
