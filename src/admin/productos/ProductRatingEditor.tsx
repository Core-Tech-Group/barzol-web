import { useState, type SyntheticEvent } from 'react';
import type { ApiResponse } from '@shared/api/apiResponse';
import { calificacionWriteSchema } from '@shared/lib/validation/calificacionSchema';
import type { AdminProduct } from './productsAdminModel';

interface Props {
  producto?: AdminProduct;
  onSaved: (promedio: number, cantidad: number) => void;
}

export default function ProductRatingEditor({ producto, onSaved }: Props) {
  const [promedio, setPromedio] = useState(String(producto?.ratingAvg ?? 0));
  const [cantidad, setCantidad] = useState(String(producto?.ratingCount ?? 0));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function guardar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!producto) return;
    const parsed = calificacionWriteSchema.safeParse({ promedio: Number(promedio), cantidad: Number(cantidad) });
    if (!parsed.success) {
      setMensaje('Ingresa un promedio de 0 a 5 y una cantidad coherente. Para quitar la calificación, deja ambos campos en cero.');
      return;
    }

    setGuardando(true);
    setMensaje('');
    try {
      const response = await fetch(`/api/productos/${producto.id}/calificacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const result: ApiResponse<null> = await response.json();
      if (response.ok && result.success) {
        onSaved(parsed.data.promedio, parsed.data.cantidad);
        setMensaje('Calificación guardada. Ya se mostrará en la tienda.');
      } else {
        setMensaje(result.message ?? 'No se pudo guardar la calificación.');
      }
    } catch {
      setMensaje('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section style={{ background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 10, padding: 18 }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }}>Calificación del producto</h2>
      <p style={{ fontSize: 12, color: 'var(--color-text-soft)', margin: '0 0 14px', lineHeight: 1.5 }}>
        Registra solo calificaciones reales conocidas por Barzol. Se guardan por separado de los demás cambios del producto. No se presentan como reseñas verificadas en Google.
      </p>
      {producto ? (
        <form className="bz-rating-form" onSubmit={guardar}>
          <label style={{ display: 'grid', gap: 5, fontSize: 12, color: 'var(--color-text-soft)' }}>
            Promedio (0–5)
            <input type="number" min="0" max="5" step="0.1" value={promedio} onChange={(event) => setPromedio(event.target.value)} required style={{ width: '100%', padding: 10, border: '1px solid var(--color-border)', borderRadius: 6 }} />
          </label>
          <label style={{ display: 'grid', gap: 5, fontSize: 12, color: 'var(--color-text-soft)' }}>
            Cantidad de calificaciones
            <input type="number" min="0" step="1" value={cantidad} onChange={(event) => setCantidad(event.target.value)} required style={{ width: '100%', padding: 10, border: '1px solid var(--color-border)', borderRadius: 6 }} />
          </label>
          <button type="submit" disabled={guardando} style={{ padding: '10px 14px', border: 0, borderRadius: 6, background: 'var(--color-primary)', color: 'white', fontWeight: 600, cursor: guardando ? 'wait' : 'pointer' }}>
            {guardando ? 'Guardando…' : 'Guardar calificación'}
          </button>
          {mensaje && <span role="status" style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--color-text-soft)' }}>{mensaje}</span>}
        </form>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--color-text-soft)', margin: 0 }}>Guarda primero el producto nuevo para poder asignarle una calificación.</p>
      )}
    </section>
  );
}
