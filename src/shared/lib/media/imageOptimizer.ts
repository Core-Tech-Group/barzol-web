// Optimización de imágenes EN EL NAVEGADOR antes de subir — el Worker no
// tiene una librería de imágenes nativa, y bajarla ahí implicaría cargar el
// archivo original entero solo para transformarlo después. Achicar acá
// también reduce lo que viaja por la red y lo que termina pagando R2.
//
// Solo corre en el cliente (usa `Image`, `canvas`, `URL.createObjectURL`) —
// no importar desde código que corre en el servidor.

export interface ImagenOptimizada {
  blob: Blob;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen — el archivo puede estar dañado.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Redimensiona (sin agrandar) a un máximo de `MAX_DIMENSION` px por lado —
 * más que suficiente para el ancho real que ocupa una foto de producto en el
 * sitio — y reencoda a WebP para un peso consistente y liviano.
 *
 * Si el navegador no soporta exportar WebP desde `canvas.toBlob` (raro, pero
 * pasa en algunos WebViews viejos), cae de vuelta a PNG sin lanzar error: el
 * `type` del blob resultante indica cuál se usó.
 */
export async function optimizeImageFile(file: File): Promise<ImagenOptimizada> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no puede procesar imágenes.');
  ctx.drawImage(img, 0, 0, width, height);

  const webp = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
  const blob = webp && webp.type === 'image/webp' ? webp : await canvasToBlob(canvas, 'image/png', 1);
  if (!blob) throw new Error('No se pudo optimizar la imagen.');

  return { blob, width, height };
}

/** Extensión de archivo que corresponde al MIME real del blob ya optimizado. */
export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/webp':
      return 'webp';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/avif':
      return 'avif';
    default:
      return 'bin';
  }
}
