import { supabase } from '../db/client';
import type { Configuracion } from '../../types';
import { mapSiteConfigurationRowToConfiguracion } from './configuracionMapper';

// ÚNICA fuente de la configuración del sitio (contacto, WhatsApp, redes).
// Tabla singleton — siempre una sola fila. Respalda /admin/configuracion
// (backlog issue #28, aún sin construir) y reemplaza los valores hoy
// hardcodeados en Header.astro, Footer.astro y WhatsAppButton.astro.

export async function getConfiguracion(): Promise<Configuracion> {
  const { data, error } = await supabase
    .from('site_configuration')
    .select('id, whatsapp_number, contact_email, instagram_url, facebook_url, address')
    .limit(1)
    .single();
  if (error) throw error;
  return mapSiteConfigurationRowToConfiguracion({ ...data, id: String(data.id) });
}

export async function updateConfiguracion(
  data: Partial<Omit<Configuracion, 'id'>>
): Promise<Configuracion> {
  throw new Error('Not implemented');
}
