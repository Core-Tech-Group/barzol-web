import { useState } from 'react';
import Toast from '@admin/shared/Toast.tsx';
import SavingOverlay from '@admin/shared/SavingOverlay.tsx';
import type { ApiResponse } from '@shared/api/apiResponse';

export interface AdminConfiguracion {
  whatsappNumero: string;
  emailContacto: string;
  instagramUrl: string;
  facebookUrl: string;
  direccion: string;
}

interface Props {
  initialConfiguracion: AdminConfiguracion;
}

function Icon({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  border: '1.5px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 13.5,
  color: 'var(--color-text)',
};

export default function ConfiguracionAdmin({ initialConfiguracion }: Props) {
  const [form, setForm] = useState<AdminConfiguracion>(initialConfiguracion);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  function update<K extends keyof AdminConfiguracion>(key: K, value: AdminConfiguracion[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappNumero: form.whatsappNumero.trim(),
          emailContacto: form.emailContacto.trim(),
          instagramUrl: form.instagramUrl.trim() || null,
          facebookUrl: form.facebookUrl.trim() || null,
          direccion: form.direccion.trim() || null,
        }),
      });
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !body.success) throw new Error(body.message || 'No se pudo guardar la configuración.');
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2200);
    } catch (e) {
      setErrorMsg((e as Error).message);
      setTimeout(() => setErrorMsg(null), 3600);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="bz-topbar"
        style={{ height: 68, background: 'white', borderBottom: '1px solid var(--color-border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0, gap: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
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
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>Contacto, WhatsApp y redes</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'var(--color-primary)', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="bz-content-pad" style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', background: 'white', border: '1px solid var(--color-border-soft)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Número de WhatsApp" hint="Sin espacios, con código de país (ej. 51950759032)">
            <input type="text" value={form.whatsappNumero} onChange={(e) => update('whatsappNumero', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Email de contacto">
            <input type="email" value={form.emailContacto} onChange={(e) => update('emailContacto', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Instagram" hint="URL completa del perfil (opcional)">
            <input type="text" value={form.instagramUrl} onChange={(e) => update('instagramUrl', e.target.value)} placeholder="https://instagram.com/..." style={inputStyle} />
          </Field>
          <Field label="Facebook" hint="URL completa de la página (opcional)">
            <input type="text" value={form.facebookUrl} onChange={(e) => update('facebookUrl', e.target.value)} placeholder="https://facebook.com/..." style={inputStyle} />
          </Field>
          <Field label="Dirección" hint="Opcional">
            <input type="text" value={form.direccion} onChange={(e) => update('direccion', e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>

      {saving && <SavingOverlay message="Guardando configuración..." />}

      {savedToast && (
        <Toast
          message="Configuración guardada exitosamente"
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
    </>
  );
}
