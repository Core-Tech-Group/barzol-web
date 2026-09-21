import type { ProductsAdminModel } from './ProductsAdmin';
import type { EditDraft } from './productsAdminModel';

export default function ProductPriceStatusFields({ view, editDraft }: { view: ProductsAdminModel; editDraft: EditDraft }) {
  const { setEditDraft, showValidation } = view;
  return (
    <>
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
    </>
  );
}
