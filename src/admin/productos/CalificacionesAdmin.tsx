import { useState, type SyntheticEvent } from 'react';
import type { ApiResponse } from '@shared/api/apiResponse';
import { calificacionWriteSchema } from '@shared/lib/validation/calificacionSchema';

export interface ProductoCalificable {
  id: string;
  nombre: string;
  promedio: number;
  cantidad: number;
}

function CalificacionFila({ producto }: { producto: ProductoCalificable }) {
  const [promedio, setPromedio] = useState(String(producto.promedio));
  const [cantidad, setCantidad] = useState(String(producto.cantidad));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function guardar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = calificacionWriteSchema.safeParse({ promedio: Number(promedio), cantidad: Number(cantidad) });
    if (!parsed.success) {
      setMensaje('Ingresa un promedio de 0 a 5 y una cantidad coherente.');
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
      setMensaje(response.ok && result.success ? 'Calificación guardada.' : result.message ?? 'No se pudo guardar.');
    } catch {
      setMensaje('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="bz-rating-form" onSubmit={guardar}>
      <strong style={{ fontSize: 13, alignSelf: 'center', color: 'var(--color-text)' }}>{producto.nombre}</strong>
      <label style={{ display: 'grid', gap: 4, fontSize: 11, color: 'var(--color-text-soft)' }}>
        Promedio
        <input type="number" min="0" max="5" step="0.1" value={promedio} onChange={(event) => setPromedio(event.target.value)} required style={{ width: '100%', padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }} />
      </label>
      <label style={{ display: 'grid', gap: 4, fontSize: 11, color: 'var(--color-text-soft)' }}>
        Cantidad
        <input type="number" min="0" step="1" value={cantidad} onChange={(event) => setCantidad(event.target.value)} required style={{ width: '100%', padding: 8, border: '1px solid var(--color-border)', borderRadius: 6 }} />
      </label>
      <button type="submit" disabled={guardando} style={{ padding: '9px 13px', border: 0, borderRadius: 6, background: 'var(--color-primary)', color: 'white', cursor: 'pointer' }}>
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
      {mensaje && <span role="status" style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--color-text-soft)' }}>{mensaje}</span>}
    </form>
  );
}

export default function CalificacionesAdmin({ productos }: { productos: ProductoCalificable[] }) {
  const [busqueda, setBusqueda] = useState('');
  const visibles = productos.filter((producto) => producto.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));

  return (
    <details style={{ marginBottom: 22, padding: 20, border: '1px solid var(--color-border-soft)', borderRadius: 10, background: 'white' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-primary)' }}>Estrellas de productos</summary>
      <p style={{ fontSize: 12, color: 'var(--color-text-soft)', lineHeight: 1.5 }}>
        Registra únicamente calificaciones reales conocidas por Barzol. Deja ambos campos en cero si el producto aún no tiene valoraciones. Estos datos no se publican como reseñas verificadas en Google.
      </p>
      <label style={{ display: 'grid', gap: 5, maxWidth: 320, fontSize: 12, color: 'var(--color-text-soft)' }}>
        Buscar producto
        <input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} style={{ padding: 9, border: '1px solid var(--color-border)', borderRadius: 6 }} />
      </label>
      <div style={{ maxHeight: 480, overflow: 'auto' }}>
        {visibles.map((producto) => <CalificacionFila key={producto.id} producto={producto} />)}
      </div>
      {visibles.length === 0 && <p style={{ fontSize: 12 }}>No hay productos que coincidan.</p>}
    </details>
  );
}
