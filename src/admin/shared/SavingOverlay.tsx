import { useEffect, useState } from 'react';

interface Props {
  message?: string;
  detail?: string;
}

export default function SavingOverlay({ message = 'Guardando cambios...', detail }: Props) {
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowHint(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17,24,39,0.55)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 14,
          padding: '30px 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
          minWidth: 240,
          maxWidth: 320,
          textAlign: 'center',
        }}
      >
        <svg className="admin-saving-spinner" width="30" height="30" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="var(--color-border)" strokeWidth="2.5" />
          <path d="M21 12a9 9 0 00-9-9" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{message}</div>
        {detail && <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>{detail}</div>}
        {showSlowHint && (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-faint)' }}>
            Puede tardar un poco más si hay fotos pesadas — no cierres ni recargues la página.
          </div>
        )}
      </div>
      <style>{`
        .admin-saving-spinner {
          animation: admin-saving-spin 0.8s linear infinite;
        }
        @keyframes admin-saving-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
