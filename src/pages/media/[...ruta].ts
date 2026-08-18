import type { APIRoute } from 'astro';
import { leerMedia } from '@shared/lib/storage/mediaDriver';
import { tipoMimePorExtension } from '@shared/lib/storage/mediaMime';

// Entrega de contenido multimedia: `GET /media/<carpeta>/<AAAA>/<MM>/<clave>`.
//
// Es la contraparte de lectura de `POST /api/media`. Existe porque en el
// despliegue local no hay un dominio público de bucket que sirva las imágenes:
// las sirve el propio sitio. Antes lo hacía un nginx de borde leyendo el
// volumen; al reemplazar el proxy por Traefik —que enruta pero no sirve
// archivos estáticos— la entrega pasó a esta ruta.
//
// Bajo el objetivo `cloudflare` el driver devuelve `null` siempre y esta ruta
// responde 404, que es exactamente lo que hacía antes de existir: ahí las
// imágenes las sirve el bucket desde su propio dominio y proxearlas por el
// worker sería gastar CPU facturable para nada.
//
// Es pública a propósito, igual que el dominio del bucket: el catálogo tiene
// que poder mostrar las fotos a un visitante sin sesión.

/** 30 días. La clave lleva un UUID, así que una URL nunca cambia de contenido. */
const CACHE_SEGUNDOS = 60 * 60 * 24 * 30;

export const GET: APIRoute = async ({ params }) => {
  const ruta = params.ruta;
  if (!ruta) return new Response(null, { status: 404 });

  // El driver vuelve a validar que la clave no se escape del directorio base;
  // esto corta antes, sobre la forma cruda de la URL, para que un intento no
  // llegue siquiera a tocar el sistema de archivos.
  if (ruta.includes('..') || ruta.includes('\0')) {
    return new Response(null, { status: 404 });
  }

  const archivo = await leerMedia(ruta);
  if (!archivo) return new Response(null, { status: 404 });

  return new Response(archivo.cuerpo, {
    status: 200,
    headers: {
      'Content-Type': tipoMimePorExtension(ruta),
      'Content-Length': String(archivo.tamano),
      // `immutable` evita incluso la petición de revalidación: la URL de una
      // imagen es única por UUID y su contenido no cambia nunca.
      'Cache-Control': `public, max-age=${CACHE_SEGUNDOS}, immutable`,
      // El navegador debe respetar el tipo declarado y no adivinarlo: sin esto,
      // un archivo cuyo contenido parece HTML se interpretaría como tal aunque
      // se sirva como imagen.
      'X-Content-Type-Options': 'nosniff',
      // Neutraliza el riesgo de un SVG malicioso servido desde nuestro propio
      // dominio (el motivo por el que `mediaSchema.ts` no acepta SVG en las
      // subidas). Un SVG dentro de un <img> nunca ejecuta scripts, pero abierto
      // directamente sí: `sandbox` lo impide, y `default-src 'none'` corta
      // cualquier recurso externo que intentara cargar.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
};
