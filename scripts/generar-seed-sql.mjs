#!/usr/bin/env node
// Convierte el catálogo de prueba de `supabase/seed-data/*.json` en un archivo
// SQL cargable de una sola pasada.
//
// El README de esa carpeta describe el trabajo a mano: insertar las raíces,
// anotar los `id` que devolvió la base, usarlos como `parent_category_id`,
// repetir con los productos... Es exactamente el tipo de tarea que conviene no
// hacer dos veces. El SQL generado resuelve cada referencia con un subselect por
// `code` —el campo de negocio, estable entre archivos— así que no depende de
// ningún `id` autonumérico conocido de antemano.
//
// Los `REEMPLAZAR_URL_IMAGEN` del seed original se sustituyen por SVG generados
// (uno por producto, con su nombre), porque `gallery_item.image_url` y
// `home_hero_image.image_url` son NOT NULL y sin ellos el INSERT falla. La base
// pública queda como el testigo `%%BASE_PUBLICA%%`, que `base-datos.sh`
// reemplaza al cargar: así el mismo SQL sirve para localhost y para el dominio
// del túnel.
//
// Uso: node scripts/generar-seed-sql.mjs <directorio-de-salida>

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirSeed = join(raiz, 'supabase', 'seed-data');
const dirSalida = process.argv[2] ?? join(raiz, 'docker', 'generado');

const TESTIGO_BASE = '%%BASE_PUBLICA%%';

const leer = (nombre) => JSON.parse(readFileSync(join(dirSeed, `${nombre}.json`), 'utf8'));

/** Literal SQL: comilla simple duplicada, o NULL si no hay valor. */
const txt = (valor) =>
  valor === null || valor === undefined || valor === ''
    ? 'NULL'
    : `'${String(valor).replace(/'/g, "''")}'`;

const num = (valor) => (valor === null || valor === undefined ? 'NULL' : String(valor));
const bool = (valor) => (valor ? 'true' : 'false');

/** Subselect por código de negocio — evita depender de ids autonuméricos. */
const idCategoria = (codigo) => `(SELECT id FROM category WHERE code = ${codigo})`;
const idProducto = (codigo) => `(SELECT id FROM product WHERE code = ${codigo})`;

const urlPlaceholder = (archivo) => `'${TESTIGO_BASE}/media/placeholder/${archivo}'`;

const lineas = [];
const escribir = (...texto) => lineas.push(...texto);

escribir(
  '-- Catálogo de prueba — GENERADO por scripts/generar-seed-sql.mjs.',
  '-- No editar a mano: se regenera en cada despliegue desde supabase/seed-data/*.json.',
  '',
  'BEGIN;',
  ''
);

// ─── 1. Marca ──────────────────────────────────────────────────────────────
escribir('-- 1. Marca');
for (const v of leer('vendor')) {
  escribir(`INSERT INTO vendor (name) VALUES (${txt(v.name)});`);
}
escribir('');

// ─── 2. Categorías ─────────────────────────────────────────────────────────
// Las raíces primero: las subcategorías las referencian por su `code`.
escribir('-- 2. Categorías raíz');
const categorias = leer('categorias');
for (const c of categorias) {
  escribir(
    `INSERT INTO category (code, name, sort_order, parent_category_id) ` +
      `VALUES (${c.codigo}, ${txt(c.nombre)}, ${c.sort_order}, NULL);`
  );
}
escribir('', '-- 2b. Subcategorías (hoja: son las que pueden llevar productos)');
for (const c of categorias) {
  for (const s of c.subcategorias ?? []) {
    escribir(
      `INSERT INTO category (code, name, sort_order, parent_category_id) ` +
        `VALUES (${s.codigo}, ${txt(s.nombre)}, ${s.sort_order}, ${idCategoria(c.codigo)});`
    );
  }
}
escribir('');

// ─── 3. Productos, características y foto de relleno ───────────────────────
escribir('-- 3. Productos');
const productos = leer('productos');
for (const p of productos) {
  escribir(
    `INSERT INTO product (code, name, description, keywords, price, original_price, ` +
      `vendor_id, category_id, status, is_active, is_personalizable) SELECT ` +
      `${p.code}, ${txt(p.name)}, ${txt(p.description)}, ${txt(p.keywords)}, ` +
      `${num(p.price)}, ${num(p.original_price)}, ` +
      `(SELECT id FROM vendor WHERE name = ${txt(p.vendor)}), ` +
      `${idCategoria(p.subcategoria_codigo)}, ` +
      `${txt(p.status)}::product_status, ${bool(p.is_active)}, ${bool(p.is_personalizable)};`
  );

  (p.features ?? []).forEach((f, i) => {
    escribir(
      `INSERT INTO product_feature (product_id, content, sort_order) SELECT ` +
        `${idProducto(p.code)}, ${txt(f)}, ${i};`
    );
  });

  // El seed original no trae fotos. Sin al menos una, las tarjetas del catálogo
  // salen vacías y la demo parece rota: se carga un SVG de relleno con el
  // nombre del producto, que el admin reemplaza subiendo la foto real.
  escribir(
    `INSERT INTO product_photo (product_id, url, sort_order) SELECT ` +
      `${idProducto(p.code)}, ${urlPlaceholder(`producto-${p.code}.svg`)}, 0;`
  );
  escribir('');
}

// Sin esto, la primera categoría o producto que cree el admin desde el panel
// chocaría contra un `code` ya usado por el seed.
escribir(
  '-- Deja las secuencias por encima de lo cargado (si no, el primer alta desde',
  '-- el panel choca con un code duplicado).',
  `SELECT setval('category_code_seq', (SELECT max(code) FROM category));`,
  `SELECT setval('product_code_seq', (SELECT max(code) FROM product));`,
  ''
);

// ─── 4. Galería ────────────────────────────────────────────────────────────
escribir('-- 4. Galería');
leer('galeria').forEach((g, i) => {
  escribir(
    `INSERT INTO gallery_item (type, image_url, title, sort_order) VALUES (` +
      `${txt(g.type)}::gallery_item_type, ${urlPlaceholder(`galeria-${i}.svg`)}, ` +
      `${txt(g.title)}, ${g.sort_order});`
  );
});
escribir('');

// ─── 5. Home ───────────────────────────────────────────────────────────────
escribir('-- 5. Imágenes del hero');
leer('home_hero_images').forEach((h, i) => {
  escribir(
    `INSERT INTO home_hero_image (image_url, sort_order) VALUES (` +
      `${urlPlaceholder(`hero-${i}.svg`)}, ${h.sort_order});`
  );
});
escribir('');

escribir('-- 6. Secciones y banners de la home');
for (const item of leer('home_items')) {
  const imagen =
    item.type === 'banner' ? urlPlaceholder(`banner-${item.sort_order}.svg`) : txt(item.image_url);

  escribir(
    `INSERT INTO home_item (type, title, is_visible, sort_order, image_url, link) VALUES (` +
      `${txt(item.type)}, ${txt(item.title)}, ${bool(item.is_visible)}, ` +
      `${item.sort_order}, ${imagen}, ${txt(item.link)});`
  );

  (item.productos_codigo ?? []).forEach((codigo, i) => {
    escribir(
      `INSERT INTO home_section_product (home_item_id, product_id, sort_order) SELECT ` +
        `(SELECT id FROM home_item WHERE type = ${txt(item.type)} AND sort_order = ${item.sort_order}), ` +
        `${idProducto(codigo)}, ${i};`
    );
  });
  escribir('');
}

// ─── 6. Configuración del sitio ────────────────────────────────────────────
const cfg = leer('configuracion');
escribir(
  '-- 7. Configuración del sitio (fila única)',
  `INSERT INTO site_configuration (whatsapp_number, contact_email, instagram_url, facebook_url, address) ` +
    `VALUES (${txt(cfg.whatsapp_number)}, ${txt(cfg.contact_email)}, ${txt(cfg.instagram_url)}, ` +
    `${txt(cfg.facebook_url)}, ${txt(cfg.address)});`,
  '',
  'COMMIT;'
);

mkdirSync(dirSalida, { recursive: true });
writeFileSync(join(dirSalida, 'seed.sql'), lineas.join('\n') + '\n', 'utf8');

// ─── SVG de relleno ────────────────────────────────────────────────────────
//
// Se generan acá y no se versionan: son consecuencia directa del seed y
// regenerarlos cuesta milisegundos. Llevan el nombre visible para que la demo
// se lea como un catálogo y no como una grilla de cuadros grises.
const dirImagenes = join(dirSalida, 'placeholder');
mkdirSync(dirImagenes, { recursive: true });

function svg(titulo, subtitulo) {
  const escapar = (t) =>
    String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${escapar(titulo)}">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e293b"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#f)"/>
  <text x="400" y="380" fill="#e2e8f0" font-family="system-ui,sans-serif" font-size="34" font-weight="600" text-anchor="middle">${escapar(titulo)}</text>
  <text x="400" y="430" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="22" text-anchor="middle">${escapar(subtitulo)}</text>
</svg>
`;
}

const imagenes = [
  ...productos.map((p) => [`producto-${p.code}.svg`, p.name, 'Imagen pendiente de carga']),
  ...leer('galeria').map((g, i) => [`galeria-${i}.svg`, g.title ?? 'Galería', 'Imagen de ejemplo']),
  ...leer('home_hero_images').map((_, i) => [`hero-${i}.svg`, 'BARZOL 3D INDUSTRY', 'Imagen de portada']),
  ...leer('home_items')
    .filter((h) => h.type === 'banner')
    .map((h) => [`banner-${h.sort_order}.svg`, 'BARZOL 3D INDUSTRY', 'Banner de ejemplo']),
];

for (const [archivo, titulo, subtitulo] of imagenes) {
  writeFileSync(join(dirImagenes, archivo), svg(titulo, subtitulo), 'utf8');
}

console.log(
  `seed.sql (${lineas.length} líneas) y ${imagenes.length} imágenes de relleno en ${dirSalida}`
);
