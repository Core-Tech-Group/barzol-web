import Toast from '@admin/shared/Toast.tsx';
import { Icon, DragHandleIcon } from '@admin/shared/AdminIcons';
import type { InicioAdminModel } from './InicioAdmin';
import InicioAdminDialogs from './InicioAdminDialogs';

export default function InicioAdminView({ view }: { view: InicioAdminModel }) {
  const { items, dirty, showValidation, showErrorToast, errorMensaje, showSavedToast, guardando, setDelConfirmIndex, editingItemId, titleDraft, setTitleDraft, dragItem, overItemIndex, setOverItemIndex, dragProduct, overProduct, setOverProduct, addSection, addBanner, startEditTitle, commitTitle, toggleItemOpen, toggleItemVisible, updateBannerLink, handleBannerImageSelected, removeBannerImage, openPicker, removeProductFromSection, dropProduct, dropItemAt, requestSaveConfirm, nombrePorId, sectionsOnly } = view;
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
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Página de inicio</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sectionsOnly.length} secciones</div>
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
              onClick={addSection}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', color: 'var(--color-text-soft)', fontSize: 13, fontWeight: 600, border: '1.5px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
            >
              <Icon size={15}>
                <path d="M12 5v14M5 12h14" stroke="var(--color-text-soft)" strokeWidth="2" strokeLinecap="round" />
              </Icon>
              Nuevo listado
            </button>
            <button
              type="button"
              onClick={addBanner}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', color: 'var(--color-text-soft)', fontSize: 13, fontWeight: 600, border: '1.5px solid var(--color-border)', borderRadius: 8, cursor: 'pointer' }}
            >
              <Icon size={15}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--color-text-soft)" strokeWidth="1.7" />
                <circle cx="8.5" cy="8.5" r="1.5" stroke="var(--color-text-soft)" strokeWidth="1.5" />
                <path d="M21 15l-5-5L5 21" stroke="var(--color-text-soft)" strokeWidth="1.5" strokeLinejoin="round" />
              </Icon>
              Agregar banner
            </button>
            <button
              type="button"
              onClick={requestSaveConfirm}
              disabled={guardando}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--color-primary)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: guardando ? 'wait' : 'pointer', opacity: guardando ? 0.6 : 1 }}
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
          message={errorMensaje}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820, margin: '0 auto' }}>
          {/* Imágenes del home — COMENTADA: la foto del hero ahora vive en el
              repo (src/assets/hero-sordinas.png, ver HomeView.astro), así que
              subirla desde acá no tenía efecto en la home. El estado
              `heroImages` sigue viajando en el guardado, así que las URLs ya
              guardadas no se pierden. Para reactivarla, descomentar el bloque.

          <div style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', background: 'var(--color-surface-soft)', borderRadius: '12px 12px 0 0', borderBottom: heroImagesOpen ? '1px solid var(--color-border-faint)' : 'none' }}
            >
              <button
                type="button"
                onClick={() => setHeroImagesOpen((v) => !v)}
                style={{ width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-muted)', transform: heroImagesOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
              >
                <Icon size={14}>
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </Icon>
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>Imágenes del home</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', marginTop: 2 }}>Sube una imagen nueva sobre cada banner para reemplazarlo</div>
              </div>
            </div>
            {heroImagesOpen && (
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 8 }}>Banner principal (hero) — hasta 3 imágenes</div>
                  <div className="bz-grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {heroImages.map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: '100%', height: 90, borderRadius: 10, overflow: 'hidden', background: 'var(--color-surface-muted)' }}>
                        {img ? (
                          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <label style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1.5px dashed var(--color-border-muted)', borderRadius: 10, color: 'var(--color-text-faint)', fontSize: 11, textAlign: 'center' }}>
                            <input type="file" accept="image/*" hidden onChange={(e) => handleHeroImageSelected(i, e.target.files)} />
                            {`Hero ${i + 1}`}
                          </label>
                        )}
                        {img && (
                          <button
                            type="button"
                            onClick={() => removeHeroImage(i)}
                            title="Quitar imagen"
                            style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 5, background: 'rgba(17,24,39,0.65)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >
                            <Icon size={11}>
                              <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                            </Icon>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>
                  El banner secundario (1489 × 186 px) se administra como un banner más abajo, junto al listado de productos, para poder reordenarlo.
                </div>
              </div>
            )}
          </div>
          */}

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 2px', marginTop: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>Secciones de productos y banners</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>Arrastra para reordenar</div>
          </div>

          {items.map((it, i) => {
            const isOver = overItemIndex === i;
            const dragHandlers = {
              draggable: true,
              onDragStart: () => {
                dragItem.current = { from: i };
              },
              onDragOver: (e: React.DragEvent) => {
                e.preventDefault();
                if (dragItem.current) setOverItemIndex(i);
              },
              onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                dropItemAt(i);
              },
              onDragEnd: () => {
                dragItem.current = null;
                setOverItemIndex(null);
              },
            };

            if (it.type === 'banner') {
              return (
                <div
                  key={it.id}
                  {...dragHandlers}
                  style={{ background: isOver ? 'var(--color-primary-light)' : 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, transition: 'background 0.12s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', background: 'var(--color-surface-soft)', borderRadius: '12px 12px 0 0', borderBottom: it.open ? '1px solid var(--color-border-faint)' : 'none' }}>
                    <div style={{ width: 16, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-border-muted)' }} title="Arrastrar para reordenar">
                      <DragHandleIcon />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleItemOpen(it.id)}
                      style={{ width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-muted)', transform: it.open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                    >
                      <Icon size={14}>
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </Icon>
                    </button>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>Banner de imagen</div>
                    <button
                      type="button"
                      onClick={() => toggleItemVisible(it.id)}
                      title="Mostrar/ocultar en el home"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: it.visible ? 'var(--color-success-soft-bg)' : 'var(--color-surface-muted)', color: it.visible ? 'var(--color-success)' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      {it.visible ? 'Visible' : 'Oculta'}
                    </button>
                    <div style={{ width: 30, height: 30, flexShrink: 0 }} />
                    <button
                      type="button"
                      onClick={() => setDelConfirmIndex(i)}
                      style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                    >
                      <Icon size={14}>
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </Icon>
                    </button>
                  </div>
                  {it.open && (
                    <div style={{ padding: '14px 18px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ position: 'relative', width: '100%', height: 150, borderRadius: 10, overflow: 'hidden', background: 'var(--color-surface-muted)' }}>
                        {it.image ? (
                          <img src={it.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <label style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1.5px dashed var(--color-border-muted)', borderRadius: 10, color: 'var(--color-text-faint)', fontSize: 12 }}>
                            <input type="file" accept="image/*" hidden onChange={(e) => handleBannerImageSelected(it.id, e.target.files)} />
                            Imagen del banner
                          </label>
                        )}
                        {it.image && (
                          <button
                            type="button"
                            onClick={() => removeBannerImage(it.id)}
                            title="Quitar imagen"
                            style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6, background: 'rgba(17,24,39,0.65)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >
                            <Icon size={12}>
                              <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                            </Icon>
                          </button>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                          Enlace del banner <span style={{ fontWeight: 400, color: 'var(--color-text-faint)' }}>(ruta interna, opcional)</span>
                        </label>
                        <input
                          type="text"
                          value={it.link}
                          onChange={(e) => updateBannerLink(it.id, e.target.value)}
                          placeholder="Ej: /categoria/sordinas"
                          style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const sec = it;
            const titleHasError = showValidation && !sec.title.trim();
            return (
              <div
                key={sec.id}
                {...dragHandlers}
                style={{ background: isOver ? 'var(--color-primary-light)' : 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, overflow: 'hidden', transition: 'background 0.12s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border-faint)' }}>
                  <div style={{ width: 16, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-border-muted)' }} title="Arrastrar para reordenar">
                    <DragHandleIcon />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleItemOpen(sec.id)}
                    style={{ width: 26, height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--color-text-muted)', transform: sec.open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                  >
                    <Icon size={14}>
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </button>

                  {editingItemId === sec.id ? (
                    <input
                      type="text"
                      data-item-edit-input={sec.id}
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={commitTitle}
                      autoFocus
                      placeholder="Título de la sección"
                      style={{ flex: 1, padding: '7px 10px', border: '1.5px solid var(--color-primary)', borderRadius: 7, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}
                    />
                  ) : (
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, color: titleHasError ? 'var(--color-danger)' : 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sec.title}</div>
                      {titleHasError ? (
                        <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600 }}>Falta el título</div>
                      ) : (
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>{sec.products.length}{sec.products.length === 1 ? ' producto' : ' productos'}</div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleItemVisible(sec.id)}
                    title="Mostrar/ocultar en el home"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: sec.visible ? 'var(--color-success-soft-bg)' : 'var(--color-surface-muted)', color: sec.visible ? 'var(--color-success)' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    {sec.visible ? 'Visible' : 'Oculta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditTitle(sec)}
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
                    style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <Icon size={14}>
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </button>
                </div>

                {sec.open && (
                  <div style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase', marginBottom: 10 }}>Productos</div>
                    {sec.products.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--color-text-faint)', marginLeft: 26, marginBottom: 10 }}>Sin productos todavía.</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, marginLeft: 26 }}>
                      {sec.products.map((productId, k) => {
                        const rowOver = overProduct && overProduct.itemId === sec.id && overProduct.index === k;
                        // Un producto borrado del catálogo deja su id colgado
                        // en la sección. Mostrarlo así es mejor que pintar un
                        // hueco: dice qué pasó y se puede quitar.
                        const name = nombrePorId.get(productId) ?? `(producto ${productId} ya no existe)`;
                        return (
                          <div
                            key={productId + k}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              dragProduct.current = { itemId: sec.id, from: k };
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragProduct.current && dragProduct.current.itemId === sec.id) setOverProduct({ itemId: sec.id, index: k });
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              dropProduct(sec.id, k);
                            }}
                            onDragEnd={(e) => {
                              e.stopPropagation();
                              dragProduct.current = null;
                              setOverProduct(null);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: rowOver ? 'var(--color-primary-light)' : 'var(--color-surface-soft)', borderRadius: 8, transition: 'background 0.12s' }}
                          >
                            <div style={{ width: 16, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-border-muted)' }} title="Arrastrar para reordenar">
                              <DragHandleIcon />
                            </div>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                            <button
                              type="button"
                              onClick={() => removeProductFromSection(sec.id, k)}
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
                      onClick={() => openPicker(sec)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', border: '1.5px dashed var(--color-border-muted)', borderRadius: 8, color: 'var(--color-text-muted)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Icon size={13}>
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </Icon>
                      Agregar producto
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <InicioAdminDialogs view={view} />
    </>
  );
}
