import ConfirmModal from '@admin/shared/ConfirmModal.tsx';
import Toast from '@admin/shared/Toast.tsx';
import SavingOverlay from '@admin/shared/SavingOverlay.tsx';
import { Icon } from '@admin/shared/AdminIcons';
import type { ProductsAdminModel } from './ProductsAdmin';

export default function ProductsAdminDialogs({ view }: { view: ProductsAdminModel }) {
  const { products, dupConfirmIndex, setDupConfirmIndex, delConfirmIndex, setDelConfirmIndex, navConfirmOpen, setNavConfirmOpen, setPendingHref, saving, deleting, savingMessage, errorMsg, successMsg, confirmDuplicate, confirmDelete, confirmNavigate } = view;
  return (
    <>

      {(saving || deleting) && <SavingOverlay message={deleting ? 'Eliminando producto...' : savingMessage} />}

      {successMsg && (
        <Toast
          message={successMsg}
          background="var(--color-success)"
          icon={
            <Icon size={16}>
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
        />
      )}

      {errorMsg && (
        <Toast
          message={errorMsg}
          background="var(--color-danger)"
          icon={
            <Icon size={16}>
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
              <path d="M12 8v5M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </Icon>
          }
        />
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
          title="Tienes una edición sin guardar"
          message="Si sales ahora, los cambios en este producto se perderán."
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

      {/* MODAL: CONFIRMAR ELIMINAR */}
      {delConfirmIndex >= 0 && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title="¿Eliminar este producto?"
          message={
            <>
              Se eliminará <strong style={{ color: 'var(--color-text-soft)' }}>"{products[delConfirmIndex]?.name}"</strong> permanentemente del catálogo. Esta acción no se puede deshacer.
            </>
          }
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          confirmBg="var(--color-danger)"
          confirmHoverBg="#b91c1c"
          onCancel={() => setDelConfirmIndex(-1)}
          onConfirm={confirmDelete}
        />
      )}

      {/* MODAL: CONFIRMAR DUPLICADO */}
      {dupConfirmIndex >= 0 && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <rect x="9" y="9" width="12" height="12" rx="2" stroke="var(--color-primary)" strokeWidth="1.8" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="var(--color-primary)" strokeWidth="1.8" />
            </Icon>
          }
          iconBg="var(--color-primary-light)"
          title="¿Duplicar este producto?"
          message={
            <>
              Se creará una copia de <strong style={{ color: 'var(--color-text-soft)' }}>"{products[dupConfirmIndex]?.name}"</strong> como borrador, lista para editar.
            </>
          }
          cancelLabel="Cancelar"
          confirmLabel="Duplicar"
          confirmBg="var(--color-primary)"
          confirmHoverBg="var(--color-primary-dark)"
          onCancel={() => setDupConfirmIndex(-1)}
          onConfirm={confirmDuplicate}
        />
      )}

    </>
  );
}
