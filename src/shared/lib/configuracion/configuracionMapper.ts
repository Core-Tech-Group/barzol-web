import type { Configuracion } from '../../types';

// Fila cruda de la tabla singleton `site_configuration`.
export interface SiteConfigurationRow {
  id: string;
  whatsapp_number: string;
  whatsapp_message_template: string;
  contact_email: string;
  instagram_url: string | null;
  facebook_url: string | null;
  address: string | null;
  personalization_banner_image_url: string | null;
}

export function mapSiteConfigurationRowToConfiguracion(row: SiteConfigurationRow): Configuracion {
  return {
    id: row.id,
    whatsappNumero: row.whatsapp_number,
    whatsappMensajePredefinido: row.whatsapp_message_template,
    emailContacto: row.contact_email,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
    direccion: row.address,
    bannerPersonalizacionImagenUrl: row.personalization_banner_image_url,
  };
}
