import { Icon } from '@admin/shared/AdminIcons';
import type { ProductsAdminModel } from './ProductsAdmin';
import ProductMediaInfoFields from './ProductMediaInfoFields';
import ProductCategoryFields from './ProductCategoryFields';
import ProductPriceStatusFields from './ProductPriceStatusFields';

export default function ProductEditModal({ view }: { view: ProductsAdminModel }) {
  const { editIndex, saving, modalScrollRef, closeEdit, saveEdit } = view;
  const { editDraft } = view;
  return (
    <>
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
              <ProductMediaInfoFields view={view} editDraft={editDraft} />
              <ProductCategoryFields view={view} editDraft={editDraft} />
              <ProductPriceStatusFields view={view} editDraft={editDraft} />
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
