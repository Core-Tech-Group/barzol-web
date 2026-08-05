import { useEffect, useState } from 'react';

interface GalleryItem {
  name: string;
}

interface Props {
  items: GalleryItem[];
}

function PhotoIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const lightboxNavBtnStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.12)',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function GalleryLightbox({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const close = () => setOpenIndex(null);
  const prev = () => setOpenIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length));
  const next = () => setOpenIndex((i) => (i === null ? null : (i + 1) % items.length));

  useEffect(() => {
    if (openIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openIndex, items.length]);

  return (
    <>
      <div className="bz-serv-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {items.map((item, i) => {
          const hovered = hoverIndex === i;
          return (
            <div
              key={item.name}
              onClick={() => setOpenIndex(i)}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                aspectRatio: '4 / 3',
                background: 'var(--color-surface-muted)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.4s ease',
                  transform: hovered ? 'scale(1.08)' : 'scale(1)',
                  color: 'var(--color-text-faint)',
                }}
              >
                <PhotoIcon />
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(0deg, rgba(11,25,40,0.8) 0%, rgba(11,25,40,0) 50%)',
                  opacity: hovered ? 1 : 0,
                  transition: 'opacity 0.25s ease',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: 16,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    transform: hovered ? 'translateY(0)' : 'translateY(6px)',
                    transition: 'transform 0.3s ease',
                  }}
                >
                  {item.name}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {openIndex !== null && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 900,
            background: 'rgba(10,15,25,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
          }}
        >
          <button
            onClick={close}
            aria-label="Cerrar"
            style={{ ...lightboxNavBtnStyle, position: 'absolute', top: 24, right: 28, width: 44, height: 44 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Anterior"
            style={{ ...lightboxNavBtnStyle, position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 900, maxHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
          >
            <div
              style={{
                width: '70vw',
                maxWidth: 800,
                height: '60vh',
                background: 'var(--color-surface-muted)',
                borderRadius: 10,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-faint)',
              }}
            >
              <PhotoIcon size={56} />
            </div>
            <span style={{ color: 'white', fontSize: 15, fontWeight: 600 }}>{items[openIndex].name}</span>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5 }}>
              {openIndex + 1} / {items.length}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Siguiente"
            style={{ ...lightboxNavBtnStyle, position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
