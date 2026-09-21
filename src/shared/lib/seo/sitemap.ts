import { productoUrl } from '../productos/productoUrl';
import { slugify } from '../text/slugify';

// SPEC-006 · REQ-601/603: una sola fuente del origen público para SEO.
export const SITE_ORIGIN = 'https://barzol3d.com';
export const SITEMAP_BATCH_SIZE = 500;
export const MAX_SITEMAP_URLS = 50_000;

export interface SitemapProductRow { code: number; name: string }
export type ReadProductBatch = (offset: number, limit: number) => Promise<SitemapProductRow[]>;

// Puerto de lectura inyectado: permite probar paginación sin red ni mocks del SDK.
export async function collectProductPaths(readBatch: ReadProductBatch): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const rows = await readBatch(offset, SITEMAP_BATCH_SIZE);
    for (const row of rows) paths.push(productoUrl({ codigo: row.code, slug: slugify(row.name) }));
    if (paths.length > MAX_SITEMAP_URLS) throw new Error('Sitemap supera el máximo de URLs permitido.');
    if (rows.length < SITEMAP_BATCH_SIZE) return paths;
    offset += SITEMAP_BATCH_SIZE;
  }
}

export function canonicalUrl(rawPath: string, options: { preservePage?: boolean } = {}): string {
  const input = new URL(rawPath, SITE_ORIGIN);
  const canonical = new URL(input.pathname, SITE_ORIGIN);
  if (options.preservePage) {
    const page = Number(input.searchParams.get('page'));
    if (Number.isSafeInteger(page) && page > 1) canonical.searchParams.set('page', String(page));
  }
  return canonical.href;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char] ?? char);
}

export function buildSitemapXml(paths: string[]): string {
  const urls = [...new Set(paths.map((path) => canonicalUrl(path)))];
  const entries = urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}
