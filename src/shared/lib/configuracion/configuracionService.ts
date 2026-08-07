import type { Configuracion } from '../../types';

// ÚNICA fuente de la configuración del sitio (contacto, WhatsApp, redes,
// banner de personalización). Tabla singleton — siempre una sola fila.
// Respalda /admin/configuracion (backlog issue #28, aún sin construir) y
// reemplaza los valores hoy hardcodeados en Header.astro, Footer.astro,
// WhatsAppButton.astro y ProductoView.astro.
//
// TODO: reemplazar el mock por una consulta real (Supabase/Drizzle o Prisma)
// cuando esté listo el ORM. La firma de cada función no cambia, así que
// ningún consumidor se toca.
// Ver configuracionMapper.ts: ya documenta la forma de la fila cruda de
// `site_configuration` y la función que la convierte a `Configuracion`.
const configuracion: Configuracion = {
  id: 'config-singleton',
  whatsappNumero: '51950759032',
  whatsappMensajePredefinido: 'Hola, me interesa un producto Barzol',
  emailContacto: 'atencioncliente@barzol.com',
  instagramUrl: null,
  facebookUrl: null,
  direccion: null,
  bannerPersonalizacionImagenUrl: null,
};

export async function getConfiguracion(): Promise<Configuracion> {
  return configuracion;
}

export async function updateConfiguracion(
  data: Partial<Omit<Configuracion, 'id'>>
): Promise<Configuracion> {
  throw new Error('Not implemented');
}
