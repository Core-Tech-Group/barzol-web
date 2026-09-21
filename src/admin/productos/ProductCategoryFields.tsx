import { Icon } from '@admin/shared/AdminIcons';
import type { ProductsAdminModel } from './ProductsAdmin';
import type { EditDraft } from './productsAdminModel';

export default function ProductCategoryFields({ view, editDraft }: { view: ProductsAdminModel; editDraft: EditDraft }) {
  const { setEditDraft, openDropdown, setOpenDropdown, catSearchQuery, setCatSearchQuery, filteredCatOptions, subOptions } = view;
  return (
    <>
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
                                    // Cambiar de categoría limpia la subcategoría en vez de
                                    // autoseleccionar la primera — es opcional, la elige el admin.
                                    setEditDraft((d) => (d ? { ...d, category: opt, instrument: '' } : d));
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
                          <span style={{ color: editDraft.instrument ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
                            {editDraft.instrument || 'Sin subcategoría'}
                          </span>
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
                              <button
                                type="button"
                                onClick={() => {
                                  setEditDraft((d) => (d ? { ...d, instrument: '' } : d));
                                  setOpenDropdown(null);
                                }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', border: 'none', borderBottom: '1px solid var(--color-border-faint)', background: !editDraft.instrument ? 'var(--color-primary-light)' : 'white', color: !editDraft.instrument ? 'var(--color-primary)' : 'var(--color-text-faint)', fontSize: 13.5, fontWeight: !editDraft.instrument ? 600 : 400, fontStyle: 'italic', cursor: 'pointer', textAlign: 'left' }}
                              >
                                Sin subcategoría
                              </button>
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

    </>
  );
}
