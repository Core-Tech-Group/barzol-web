import { supabase } from '../db/client';
import type { SupabaseClient } from '@supabase/supabase-js';
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

// `site_configuration` es singleton (índice único que fuerza 1 sola fila) —
// esta función SIEMPRE hace UPDATE de la fila existente, nunca INSERT.
export async function updateConfiguracion(
  supabaseAuth: SupabaseClient,
  data: Partial<{
    whatsappNumero: string;
    emailContacto: string;
    instagramUrl: string | null;
    facebookUrl: string | null;
    direccion: string | null;
  }>
): Promise<Configuracion> {
  const current = await getConfiguracion();

  const { error } = await supabaseAuth
    .from('site_configuration')
    .update({
      whatsapp_number: data.whatsappNumero,
      contact_email: data.emailContacto,
      instagram_url: data.instagramUrl,
      facebook_url: data.facebookUrl,
      address: data.direccion,
    })
    .eq('id', Number(current.id));
  if (error) throw error;

  return getConfiguracion();
}
