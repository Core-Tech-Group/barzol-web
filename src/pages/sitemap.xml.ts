import type { APIRoute } from 'astro';
import { buildSitemapXml } from '@shared/lib/seo/sitemap';
import { getSitemapPaths } from '@shared/lib/seo/sitemapRepository';
import { logServerError } from '@shared/lib/errors/logServerError';

export const GET: APIRoute = async () => {
  try {
    return new Response(buildSitemapXml(await getSitemapPaths()), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (error) {
    logServerError({ contexto: 'sitemap', ruta: '/sitemap.xml', metodo: 'GET' }, error);
    return new Response('Sitemap no disponible.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
};
