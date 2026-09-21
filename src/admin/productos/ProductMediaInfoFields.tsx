import { Icon } from '@admin/shared/AdminIcons';
import type { ProductsAdminModel } from './ProductsAdmin';
import type { EditDraft } from './productsAdminModel';
import { IMAGE_ACCEPT } from './productsAdminModel';

export default function ProductMediaInfoFields({ view, editDraft }: { view: ProductsAdminModel; editDraft: EditDraft }) {
  const { vendors } = view;
  const { setEditDraft, photoPreviews, procesandoFotos, showValidation, dragPhoto, overPhoto, setOverPhoto, dragFeature, overFeature, setOverFeature, handlePhotoFile, handlePhotosSelected, removePhoto, swapPhotos, addFeature, updateFeature, removeFeature, reorderFeature } = view;
  return (
    <>
              {/* SECCIÓN: Fotos */}
              <div id="edit-section-photos" style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>
                    Fotos del producto <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(hasta 5)</span>
                  </div>
                  <label
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', border: '1.5px dashed var(--color-border-muted)', borderRadius: 7, color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                  >
                    <input type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={(e) => handlePhotosSelected(e.target.files)} />
                    <Icon size={12}>
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                    Subir fotos
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 12, rowGap: 16, flexWrap: 'wrap' }}>
                  {editDraft.photos.map((photo, i) => {
                    const preview = photoPreviews[i];
                    return (
                      <div
                        key={i}
                        draggable={!!photo}
                        onDragStart={() => {
                          if (photo) dragPhoto.current = { from: i };
                        }}
                        onDragEnter={(e) => {
                          if (dragPhoto.current) {
                            e.preventDefault();
                            setOverPhoto(i);
                          }
                        }}
                        onDragOver={(e) => {
                          if (dragPhoto.current) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragPhoto.current && dragPhoto.current.from !== i) {
                            swapPhotos(dragPhoto.current.from, i);
                          }
                          dragPhoto.current = null;
                          setOverPhoto(null);
                        }}
                        onDragEnd={() => {
                          dragPhoto.current = null;
                          setOverPhoto(null);
                        }}
                        style={{ width: 130, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: 130,
                            height: 100,
                            borderRadius: 8,
                            outline: overPhoto === i ? '2px solid var(--color-primary)' : 'none',
                            outlineOffset: 2,
                            cursor: photo ? 'grab' : 'default',
                            background: 'var(--color-surface-muted)',
                            overflow: 'hidden',
                          }}
                        >
                          {preview ? (
                            <label style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}>
                              <input type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => handlePhotoFile(i, e.target.files?.[0] ?? null)} />
                              <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </label>
                          ) : photo ? (
                            <label style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}>
                              <input type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => handlePhotoFile(i, e.target.files?.[0] ?? null)} />
                              <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            </label>
                          ) : (
                            <label style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: 10, textAlign: 'center', padding: 4 }}>
                              <input type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => handlePhotoFile(i, e.target.files?.[0] ?? null)} />
                              {i === 0 ? 'Foto principal' : `Foto ${i + 1}`}
                            </label>
                          )}
                          {procesandoFotos[i] && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'white' }}>Procesando...</span>
                            </div>
                          )}
                          <div style={{ position: 'absolute', top: 4, left: 4, width: 18, height: 18, borderRadius: 5, background: 'rgba(17,24,39,0.65)', color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            {i + 1}
                          </div>
                          {(photo || preview) && !procesandoFotos[i] && (
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              title="Quitar foto"
                              style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 5, background: 'rgba(17,24,39,0.65)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            >
                              <Icon size={10}>
                                <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
                              </Icon>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 10 }}>
                  La foto 1 es la principal. Arrastra las tarjetas para reordenar. Las imágenes se optimizan (se redimensionan y convierten a WebP) y se suben al guardar los cambios.
                </div>
                {showValidation && editDraft.statusLabel === 'Publicado' && editDraft.active && !editDraft.photos.some(Boolean) && (
                  <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600, marginTop: 4 }}>Un producto publicado y activo necesita al menos 1 foto</div>
                )}
              </div>

              {/* SECCIÓN: Información general */}
              <div style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>Información general</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: 12 }}>
                  <div>
                    <label id="edit-field-name" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                      Nombre del producto
                    </label>
                    <input
                      type="text"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                      style={{ width: '100%', padding: '10px 13px', border: showValidation && !editDraft.name.trim() ? '1.5px solid var(--color-danger)' : '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)' }}
                    />
                    {showValidation && !editDraft.name.trim() && <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600, marginTop: 4 }}>El nombre es obligatorio</div>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>Vendedor</label>
                    <select
                      value={editDraft.vendor}
                      onChange={(e) => setEditDraft((d) => (d ? { ...d, vendor: e.target.value } : d))}
                      style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)', background: 'white' }}
                    >
                      {vendors.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>Descripción</label>
                  <textarea
                    value={editDraft.description}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, description: e.target.value } : d))}
                    rows={3}
                    placeholder="Ej: Incorpora un mejor ángulo de inclinación, mayor versatilidad y una posición de lectura más cómoda para evitar distracciones."
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>
                    Palabras clave de búsqueda <span style={{ fontWeight: 400, color: 'var(--color-text-faint)' }}>(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={editDraft.keywords}
                    onChange={(e) => setEditDraft((d) => (d ? { ...d, keywords: e.target.value } : d))}
                    placeholder="Ej: soporte celular, atril, partitura, mute"
                    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13.5, color: 'var(--color-text)' }}
                  />
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)', marginTop: 5 }}>Separadas por comas. Solo sinónimos o términos adicionales — no repitas el nombre del producto ni la categoría/subcategoría, esos ya se buscan automáticamente.</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 8 }}>Características</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {editDraft.features.map((feat, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={() => {
                          dragFeature.current = { from: i };
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragFeature.current) setOverFeature(i);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFeature.current && dragFeature.current.from !== i) {
                            reorderFeature(dragFeature.current.from, i);
                          }
                          dragFeature.current = null;
                          setOverFeature(null);
                        }}
                        onDragEnd={() => {
                          dragFeature.current = null;
                          setOverFeature(null);
                        }}
                        style={{ display: 'flex', gap: 6, alignItems: 'center', background: overFeature === i ? 'var(--color-primary-light)' : 'transparent', borderRadius: 7, transition: 'background 0.12s' }}
                      >
                        <div style={{ width: 16, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-text-faint)' }} title="Arrastrar para reordenar">
                          <svg width="9" height="15" viewBox="0 0 9 15" fill="currentColor">
                            <circle cx="1.6" cy="1.6" r="1.3" />
                            <circle cx="7.4" cy="1.6" r="1.3" />
                            <circle cx="1.6" cy="7.5" r="1.3" />
                            <circle cx="7.4" cy="7.5" r="1.3" />
                            <circle cx="1.6" cy="13.4" r="1.3" />
                            <circle cx="7.4" cy="13.4" r="1.3" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) => updateFeature(i, e.target.value)}
                          style={{ flex: 1, padding: '9px 12px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeFeature(i)}
                          style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-faint)' }}
                        >
                          <Icon size={14}>
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </Icon>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addFeature}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'transparent', border: '1.5px dashed var(--color-border-muted)', borderRadius: 8, color: 'var(--color-text-muted)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Icon size={13}>
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </Icon>
                      Agregar característica
                    </button>
                  </div>
                </div>
              </div>

    </>
  );
}
