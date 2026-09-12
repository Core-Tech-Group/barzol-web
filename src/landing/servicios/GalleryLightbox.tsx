import { useEffect, useState } from 'react';
import { estadoImagen } from '@shared/lib/galeria/imagenGaleria';

interface GalleryItem {
  name: string;
  /**
   * SPEC-905 REQ-982. Este campo no existía: el componente pintaba el marcador
   * de posición siempre, y las dos vistas que lo alimentan descartaban la URL
   * antes de dársela. Los cuadros grises de `BZ-82` no eran imágenes rotas —
   * era el diseño funcionando como se escribió.
   */
  imagenUrl?: string | null;
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

// Columnas de la rejilla según el ancho. Van acá y no en las vistas: el
// <style> de una vista de Astro es scoped y no alcanza los nodos que pinta
// esta isla de React, así que las reglas responsive de las vistas nunca se
// aplicaban y en móvil quedaban tres columnas diminutas.
const GALERIA_CSS = `
.bz-serv-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 860px) { .bz-serv-gallery { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
@media (max-width: 480px) { .bz-serv-gallery { grid-template-columns: 1fr; } }
`;

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
  // REQ-983 — una URL puede ser válida y aun así devolver 404, que es lo que
  // `BZ-76` documenta para dos imágenes de producto. Un `<img>` roto en una
  // rejilla se ve peor que el marcador: se anota el fallo y se degrada.
  const [rotas, setRotas] = useState<Record<number, boolean>>({});

  const muestraFoto = (i: number) => estadoImagen(items[i].imagenUrl) === 'ok' && !rotas[i];
  const marcarRota = (i: number) => setRotas((prev) => ({ ...prev, [i]: true }));

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
      <style>{GALERIA_CSS}</style>
      <div className="bz-serv-gallery">
        {items.map((item, i) => {
          const hovered = hoverIndex === i;
          return (
            <div
              // Por índice y no por `name`: dos trabajos pueden llamarse igual,
              // y con la clave repetida React reutiliza el nodo equivocado.
              key={`${i}-${item.name}`}
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
                {muestraFoto(i) ? (
                  <img
                    src={item.imagenUrl!}
                    alt={item.name}
                    loading="lazy"
                    onError={() => marcarRota(i)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <PhotoIcon />
                )}
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
                overflow: 'hidden',
              }}
            >
              {muestraFoto(openIndex) ? (
                <img
                  src={items[openIndex].imagenUrl!}
                  alt={items[openIndex].name}
                  onError={() => marcarRota(openIndex)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <PhotoIcon size={56} />
              )}
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
