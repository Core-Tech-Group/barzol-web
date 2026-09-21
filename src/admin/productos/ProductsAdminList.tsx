import { Icon } from '@admin/shared/AdminIcons';
import type { ProductsAdminModel } from './ProductsAdmin';
import { PAGE_SIZE } from './productsAdminModel';

export default function ProductsAdminList({ view }: { view: ProductsAdminModel }) {
  const { categories } = view;
  const { products, query, setQuery, activeCat, setActiveCat, setPage, setDupConfirmIndex, setDelConfirmIndex, filtered, totalPages, safePage, pageStart, pageItems, openEdit, openNewProduct, toggleActive } = view;
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
          <div className="bz-table-head" style={{ display: 'grid', gridTemplateColumns: '2.6fr 1.1fr 1fr 0.8fr 90px', gap: 12, padding: '13px 20px', background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border-soft)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Producto</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Categoría</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Precio</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Estado</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</span>
          </div>

          {pageItems.map((p) => (
            <div
              key={p.id}
              className="admin-product-row bz-table-row"
              onClick={() => openEdit(p._i)}
              style={{ display: 'grid', gridTemplateColumns: '2.6fr 1.1fr 1fr 0.8fr 90px', gap: 12, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--color-border-faint)', cursor: 'pointer' }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActive(p._i);
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(p._i);
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setDupConfirmIndex(p._i);
                  }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setDelConfirmIndex(p._i);
                  }}
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
      <style>{`
        .admin-product-row:hover {
          background: var(--color-surface-soft);
        }
      `}</style>
    </>
  );
}
