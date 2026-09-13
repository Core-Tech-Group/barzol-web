// Imágenes fijas del diseño del sitio: heros y tarjetas del home y de las
// páginas de servicio. Las que se administran desde el panel (productos,
// galerías) no van acá: esas se suben a R2.
//
// Para cambiar una foto:
//   1. Reemplazá el archivo en src/assets/ (mismo nombre) o agregá una entrada.
//   2. Corré `npm run imagenes`.
//   3. Commiteá lo que cambió en public/img/ y en imagenesOptimizadas.json.
//
// `nombre`: con él se usa en las vistas → <ImagenOptimizada nombre="…" />.
// `anchos`: versiones a generar, en px. El navegador elige una según `sizes`;
//           pensalas para 1x y 2x del tamaño en que se muestra. Las que
//           superen el ancho del original se reemplazan por el original (no se
//           agranda nada).
export const IMAGENES = [
  // Home — slider del hero (se muestran a ~62% del ancho de la pantalla).
  { nombre: 'hero-impresion-3d', origen: 'src/assets/hero-impresion-3d.jpg', anchos: [768, 1280, 1920] },
  { nombre: 'hero-diseno-cad', origen: 'src/assets/hero-diseno-cad.jpg', anchos: [768, 1280, 1920] },
  { nombre: 'hero-escaneo-3d', origen: 'src/assets/hero-escaneo-3d.jpg', anchos: [768, 1280, 1920] },

  // Home — tarjetas de servicios (~190px) y arcos de Accesorios (~230px).
  { nombre: 'personalizado-nombre-firma', origen: 'src/assets/personalizado-nombre-firma.png', anchos: [240, 480] },
  { nombre: 'personalizado-logo-banda', origen: 'src/assets/personalizado-logo-banda.png', anchos: [240, 480] },
  { nombre: 'personalizado-nombre-diseno', origen: 'src/assets/personalizado-nombre-diseno.png', anchos: [240, 480] },
  { nombre: 'servicio-ingenieria-avanzada', origen: 'src/assets/servicio-ingenieria-avanzada.png', anchos: [240, 480] },
  { nombre: 'servicio-escaneo-impresion-3d', origen: 'src/assets/servicio-escaneo-impresion-3d.png', anchos: [240, 480] },

  // Escaneo e impresión 3D — hero (impresora ~280px, escaneo ~660px).
  { nombre: 'escaneo-hero-impresora', origen: 'src/assets/escaneo-hero-impresora.jpg', anchos: [300, 600] },
  { nombre: 'escaneo-hero-escaner', origen: 'src/assets/escaneo-hero-escaner.jpg', anchos: [700, 1400] },

  // Trabajos de ingeniería avanzada — hero (~660-810px).
  { nombre: 'ingenieria-hero', origen: 'src/assets/ingenieria-hero.jpg', anchos: [768, 1280, 1920] },
];
