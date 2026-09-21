import { pedir, pasa, falla } from './sondas.mjs';

const DOMINIO = 'https://barzol3d.com';

// SPEC-006: sondas de solo lectura, compatibles con Workers Builds.
export async function seoEsencial(base) {
  const resultados = [];

  const sitemap = await pedir(new URL('/sitemap.xml', base).toString());
  const sitemapDesc = 'sitemap público con URLs canónicas';
  resultados.push(!sitemap.ok
    ? falla('TEST-S61', sitemapDesc, sitemap.error, sitemap.ms)
    : sitemap.estado === 200 && sitemap.cuerpo.includes(`<loc>${DOMINIO}/</loc>`) && sitemap.cuerpo.includes('<urlset')
      ? pasa('TEST-S61', sitemapDesc, sitemap.ms)
      : falla('TEST-S61', sitemapDesc, `estado ${sitemap.estado} o XML incompleto`, sitemap.ms));

  const robots = await pedir(new URL('/robots.txt', base).toString());
  const robotsDesc = 'robots anuncia el sitemap';
  resultados.push(!robots.ok
    ? falla('TEST-S62', robotsDesc, robots.error, robots.ms)
    : robots.estado === 200 && robots.cuerpo.includes(`Sitemap: ${DOMINIO}/sitemap.xml`)
      ? pasa('TEST-S62', robotsDesc, robots.ms)
      : falla('TEST-S62', robotsDesc, `estado ${robots.estado} o falta Sitemap`, robots.ms));

  const home = await pedir(base);
  const canonicalDesc = 'home tiene canónica de dominio oficial';
  resultados.push(!home.ok
    ? falla('TEST-S63', canonicalDesc, home.error, home.ms)
    : home.estado === 200 && home.cuerpo.includes(`<link rel="canonical" href="${DOMINIO}/"`)
      ? pasa('TEST-S63', canonicalDesc, home.ms)
      : falla('TEST-S63', canonicalDesc, `estado ${home.estado} o falta canonical`, home.ms));

  return resultados;
}
