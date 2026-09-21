import type { APIRoute } from 'astro';
import { SITE_ORIGIN } from '@shared/lib/seo/sitemap';

export const GET: APIRoute = () => new Response([
  'User-agent: *',
  'Allow: /',
  'Allow: /admin/login',
  'Disallow: /admin/',
  'Disallow: /api/',
  `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
  '',
].join('\n'), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
});
