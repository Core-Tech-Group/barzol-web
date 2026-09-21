import ConfirmModal from '@admin/shared/ConfirmModal.tsx';
import { Icon } from '@admin/shared/AdminIcons';
import type { InicioAdminModel } from './InicioAdmin';

export default function InicioAdminDialogs({ view }: { view: InicioAdminModel }) {
  const { saveConfirmOpen, setSaveConfirmOpen, setDelConfirmIndex, picker, setPicker, pickerQuery, setPickerQuery, navConfirmOpen, setNavConfirmOpen, setPendingHref, confirmNavigate, confirmDeleteItem, addProductToSection, confirmSaveChanges, deletingItem, pickerItem, pickerResults } = view;
  return (
    <>
      {/* MODAL: AGREGAR PRODUCTO A SECCIÓN */}
      {picker && pickerItem && (
        <div onClick={() => setPicker(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 440, maxHeight: '78vh', background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '20px 22px 14px' }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)', marginBottom: 10 }}>Agregar producto a "{pickerItem.title}"</div>
              <input
                type="text"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Buscar producto..."
                autoFocus
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--color-border)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)' }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px' }}>
              {pickerResults.map((p) => {
                const added = pickerItem.products.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProductToSection(pickerItem.id, p.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', border: 'none', background: 'white', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>{p.category}</div>
                    </div>
                    {added ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-success)', flexShrink: 0 }}>Agregado</span>
                    ) : (
                      <Icon size={15}>
                        <path d="M12 5v14M5 12h14" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" />
                      </Icon>
                    )}
                  </button>
                );
              })}
              {pickerResults.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>Sin resultados</div>}
            </div>
            <div style={{ padding: '12px 22px 18px', borderTop: '1px solid var(--color-border-faint)' }}>
              <button type="button" onClick={() => setPicker(null)} style={{ width: '100%', padding: 10, border: 'none', background: 'transparent', color: 'var(--color-text-faint)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL: CONFIRMAR ELIMINAR (sección o banner) */}
      {deletingItem && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title={deletingItem.type === 'banner' ? '¿Eliminar este banner?' : '¿Eliminar esta sección?'}
          message={
            deletingItem.type === 'banner' ? (
              'Se quitará esta imagen del home.'
            ) : (
              <>
                Se quitará <strong style={{ color: 'var(--color-text-soft)' }}>"{deletingItem.title}"</strong> del home. Los productos no se eliminan, solo dejan de mostrarse ahí.
              </>
            )
          }
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          confirmBg="var(--color-danger)"
          confirmHoverBg="#b91c1c"
          onCancel={() => setDelConfirmIndex(-1)}
          onConfirm={confirmDeleteItem}
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
          message="Se actualizarán los listados de productos del home."
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
