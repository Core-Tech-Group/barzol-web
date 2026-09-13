// Genera las versiones WebP de las imágenes fijas del sitio y el manifiesto
// que usa <ImagenOptimizada>. Uso: `npm run imagenes`.
//
// Por qué existe: con <Image> de astro:assets, cada imagen del repo pasaba por
// /_image, que la redimensiona y convierte a WebP en cada petición. Acá esa
// conversión se hace una sola vez: los .webp quedan en public/img/ y se sirven
// tal cual desde el CDN, igual de rápido que las fotos de R2.
//
// Qué imágenes y en qué anchos: scripts/imagenes/imagenes.config.mjs.
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { IMAGENES } from './imagenes.config.mjs';

const SALIDA = 'public/img';
const MANIFIESTO = 'src/landing/shared/imagenesOptimizadas.json';
const CALIDAD = 80;

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

await mkdir(SALIDA, { recursive: true });

const manifiesto = {};
const generados = new Set();

for (const { nombre, origen, anchos } of IMAGENES) {
  const meta = await sharp(origen).metadata();
  // Nunca se agranda: los anchos mayores al original se cambian por el original.
  const finales = [...new Set(anchos.map((w) => Math.min(w, meta.width)))].sort((a, b) => a - b);

  const pesos = [];
  for (const ancho of finales) {
    const archivo = `${nombre}-${ancho}.webp`;
    await sharp(origen)
      .rotate() // respeta la orientación EXIF de las fotos de cámara
      .resize({ width: ancho })
      .webp({ quality: CALIDAD, alphaQuality: 90, effort: 5 })
      .toFile(join(SALIDA, archivo));
    generados.add(archivo);
    pesos.push(`${ancho}px ${kb((await stat(join(SALIDA, archivo))).size)}`);
  }

  manifiesto[nombre] = { anchos: finales, ancho: meta.width, alto: meta.height };
  console.log(`✓ ${nombre} (${kb((await stat(origen)).size)} original) → ${pesos.join(' · ')}`);
}

// Borra los .webp que ya no salen de la configuración (una foto que se quitó
// o un ancho que cambió), para que public/img/ no acumule archivos huérfanos.
for (const archivo of await readdir(SALIDA)) {
  if (archivo.endsWith('.webp') && !generados.has(archivo)) {
    await rm(join(SALIDA, archivo));
    console.log(`✗ borrado ${archivo} (ya no está en la configuración)`);
  }
}

await writeFile(MANIFIESTO, `${JSON.stringify(manifiesto, null, 2)}\n`);
console.log(`\nManifiesto actualizado: ${MANIFIESTO}`);
