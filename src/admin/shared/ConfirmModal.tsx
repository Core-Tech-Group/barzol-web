import { useState } from 'react';

interface Props {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  message: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  confirmBg: string;
  confirmHoverBg: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmModal({ icon, iconBg, title, message, cancelLabel, confirmLabel, confirmBg, confirmHoverBg, onCancel, onConfirm }: Props) {
  const [confirmHover, setConfirmHover] = useState(false);
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,24,39,0.45)',
        zIndex: 460,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'white',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          padding: '28px 26px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 18px',
            borderRadius: '50%',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 9,
              border: '1.5px solid var(--color-border)',
              background: 'white',
              color: 'var(--color-text-soft)',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            onMouseEnter={() => setConfirmHover(true)}
            onMouseLeave={() => setConfirmHover(false)}
            style={{
              flex: 1,
              padding: 11,
              borderRadius: 9,
              border: 'none',
              background: confirmHover ? confirmHoverBg : confirmBg,
              color: 'white',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
