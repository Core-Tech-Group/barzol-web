import { useState } from 'react';
import Toast from '@admin/shared/Toast.tsx';
import ConfirmModal from '@admin/shared/ConfirmModal.tsx';
import type { ApiResponse } from '@shared/api/apiResponse';

// Configuración → mantenimiento de vendedores (tabla `vendor`).
//
// Hasta el 2026-09-11 esta pantalla era un formulario de contacto/redes que
// guardaba en `site_configuration`. Se quitó a pedido del responsable: esos
// datos no se administran desde acá.

export interface AdminVendedor {
  id: string;
  nombre: string;
  /** Cuántos productos lo usan. Con alguno, no se puede eliminar. */
  productos: number;
}

interface Props {
  initialVendedores: AdminVendedor[];
}

function Icon({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 13.5,
  color: 'var(--color-text)',
  boxSizing: 'border-box',
};

const botonPrimario: React.CSSProperties = {
  padding: '9px 16px',
  background: 'var(--color-primary)',
  color: 'white',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const botonIcono: React.CSSProperties = {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'white',
  border: '1px solid var(--color-border)',
  borderRadius: 7,
  cursor: 'pointer',
  flexShrink: 0,
};

const porNombre = (a: AdminVendedor, b: AdminVendedor) => a.nombre.localeCompare(b.nombre, 'es');
const mismoNombre = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

async function pedir<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const sobre = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !sobre.success) throw new Error(sobre.message || `No se pudo completar la operación (${res.status}).`);
  return sobre.data as T;
}

export default function ConfiguracionAdmin({ initialVendedores }: Props) {
  const [vendedores, setVendedores] = useState<AdminVendedor[]>([...initialVendedores].sort(porNombre));
  const [nuevo, setNuevo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');
  const [aEliminar, setAEliminar] = useState<AdminVendedor | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; mensaje: string } | null>(null);

  function avisar(tipo: 'ok' | 'error', mensaje: string) {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), tipo === 'ok' ? 2200 : 4000);
  }

  // Validación inmediata; el servidor vuelve a validar igual.
  function nombreInvalido(nombre: string, exceptoId?: string): string | null {
    if (!nombre.trim()) return 'Escribí un nombre.';
    if (nombre.trim().length > 100) return 'El nombre no puede superar los 100 caracteres.';
    if (vendedores.some((v) => v.id !== exceptoId && mismoNombre(v.nombre, nombre))) return `Ya existe un vendedor llamado "${nombre.trim()}".`;
    return null;
  }

  async function agregar() {
    const problema = nombreInvalido(nuevo);
    if (problema) return avisar('error', problema);
    setOcupado(true);
    try {
      const creado = await pedir<{ id: string; nombre: string }>('/api/vendedores', 'POST', { nombre: nuevo.trim() });
      setVendedores((prev) => [...prev, { ...creado, productos: 0 }].sort(porNombre));
      setNuevo('');
      avisar('ok', 'Vendedor agregado');
    } catch (e) {
      avisar('error', (e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function empezarEdicion(v: AdminVendedor) {
    setEditandoId(v.id);
    setNombreEditado(v.nombre);
  }

  async function guardarEdicion(v: AdminVendedor) {
    if (mismoNombre(nombreEditado, v.nombre) && nombreEditado.trim() === v.nombre) {
      setEditandoId(null);
      return;
    }
    const problema = nombreInvalido(nombreEditado, v.id);
    if (problema) return avisar('error', problema);
    setOcupado(true);
    try {
      const guardado = await pedir<{ id: string; nombre: string }>(`/api/vendedores/${v.id}`, 'PUT', { nombre: nombreEditado.trim() });
      setVendedores((prev) => prev.map((x) => (x.id === v.id ? { ...x, nombre: guardado.nombre } : x)).sort(porNombre));
      setEditandoId(null);
      avisar('ok', 'Vendedor actualizado');
    } catch (e) {
      avisar('error', (e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function pedirEliminar(v: AdminVendedor) {
    // Con productos no se puede: se avisa sin ir al servidor. La base lo
    // impide de todas formas (ON DELETE RESTRICT).
    if (v.productos > 0) {
      return avisar(
        'error',
        `"${v.nombre}" tiene ${v.productos} ${v.productos === 1 ? 'producto asociado' : 'productos asociados'}. Reasignalos a otro vendedor antes de eliminarlo.`
      );
    }
    setAEliminar(v);
  }

  async function confirmarEliminar() {
    const v = aEliminar;
    setAEliminar(null);
    if (!v) return;
    setOcupado(true);
    try {
      await pedir<null>(`/api/vendedores/${v.id}`, 'DELETE');
      setVendedores((prev) => prev.filter((x) => x.id !== v.id));
      avisar('ok', 'Vendedor eliminado');
    } catch (e) {
      avisar('error', (e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div
        className="bz-topbar"
        style={{ height: 68, background: 'white', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', padding: '0 32px', flexShrink: 0, gap: 14 }}
      >
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
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>Configuración</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>Vendedores de los productos</div>
        </div>
      </div>

      <div className="bz-content-pad" style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border-faint)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Vendedores</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                {vendedores.length} {vendedores.length === 1 ? 'vendedor' : 'vendedores'}
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                agregar();
              }}
              style={{ display: 'flex', gap: 8 }}
            >
              <input type="text" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nombre del nuevo vendedor" maxLength={100} style={inputStyle} />
              <button type="submit" disabled={ocupado} style={{ ...botonPrimario, opacity: ocupado ? 0.7 : 1 }}>
                Agregar
              </button>
            </form>
          </div>

          {vendedores.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13.5 }}>Todavía no hay vendedores.</div>}

          {vendedores.map((v) => (
            <div key={v.id} className="bz-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--color-border-faint)' }}>
              {editandoId === v.id ? (
                <>
                  <input
                    type="text"
                    value={nombreEditado}
                    autoFocus
                    maxLength={100}
                    onChange={(e) => setNombreEditado(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') guardarEdicion(v);
                      if (e.key === 'Escape') setEditandoId(null);
                    }}
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => guardarEdicion(v)} disabled={ocupado} style={{ ...botonPrimario, opacity: ocupado ? 0.7 : 1 }}>
                    Guardar
                  </button>
                  <button type="button" onClick={() => setEditandoId(null)} style={{ ...botonPrimario, background: 'white', color: 'var(--color-text-soft)', border: '1px solid var(--color-border)' }}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 2 }}>
                      {v.productos === 0 ? 'Sin productos' : `${v.productos} ${v.productos === 1 ? 'producto' : 'productos'}`}
                    </div>
                  </div>
                  <button type="button" title="Editar" aria-label={`Editar ${v.nombre}`} onClick={() => empezarEdicion(v)} style={botonIcono}>
                    <Icon size={14}>
                      <path d="M12 20h9" stroke="var(--color-text-soft)" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="var(--color-text-soft)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </button>
                  <button
                    type="button"
                    title={v.productos > 0 ? 'Tiene productos: reasignalos antes de eliminarlo' : 'Eliminar'}
                    aria-label={`Eliminar ${v.nombre}`}
                    onClick={() => pedirEliminar(v)}
                    style={{ ...botonIcono, opacity: v.productos > 0 ? 0.45 : 1 }}
                  >
                    <Icon size={14}>
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </Icon>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 640, margin: '10px auto 0', fontSize: 11.5, color: 'var(--color-text-faint)' }}>
          Son las opciones del campo "Vendedor" al crear o editar un producto. Un vendedor con productos no se puede eliminar.
        </div>
      </div>

      {aEliminar && (
        <ConfirmModal
          icon={
            <Icon size={26}>
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Icon>
          }
          iconBg="var(--color-danger-bg)"
          title={`¿Eliminar "${aEliminar.nombre}"?`}
          message="Esta acción no se puede deshacer."
          cancelLabel="Cancelar"
          confirmLabel="Eliminar"
          confirmBg="var(--color-danger)"
          confirmHoverBg="#b91c1c"
          onCancel={() => setAEliminar(null)}
          onConfirm={confirmarEliminar}
        />
      )}

      {toast && (
        <Toast
          message={toast.mensaje}
          background={toast.tipo === 'ok' ? 'var(--color-success)' : 'var(--color-danger)'}
          icon={
            <Icon size={16}>
              {toast.tipo === 'ok' ? (
                <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
                  <path d="M12 8v5M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </Icon>
          }
        />
      )}
    </>
  );
}
