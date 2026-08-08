// Construcción de claves ("keys") de objetos en R2. Funciones puras, sin
// dependencias de configuración ni de red, para poder razonarlas y probarlas
// solas.

/**
 * Carpeta lógica dentro del bucket. Es un enum cerrado a propósito: la carpeta
 * llega desde el panel admin (entrada hostil), y aceptar texto libre permitiría
 * escribir fuera del prefijo previsto.
 */
export const MEDIA_FOLDERS = ['productos', 'galeria', 'home'] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

const MAX_BASE_LENGTH = 60;

/**
 * Normaliza un nombre de archivo a algo seguro para una URL pública:
 * sin tildes, sin espacios, sin rutas y en minúsculas.
 *
 * Descarta cualquier componente de directorio (`../`, `C:\...`) antes de
 * limpiar — el nombre lo elige quien sube el archivo y no es de fiar.
 */
export function sanitizeFileName(fileName: string): string {
  const soloNombre = fileName.split(/[/\\]/).pop() ?? '';
  const puntoFinal = soloNombre.lastIndexOf('.');
  const tieneExtension = puntoFinal > 0;

  const base = tieneExtension ? soloNombre.slice(0, puntoFinal) : soloNombre;
  const extension = tieneExtension ? soloNombre.slice(puntoFinal + 1) : '';

  const limpiar = (texto: string) =>
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita los diacríticos que dejó el NFD
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const baseLimpia = limpiar(base).slice(0, MAX_BASE_LENGTH) || 'archivo';
  const extensionLimpia = limpiar(extension);

  return extensionLimpia ? `${baseLimpia}.${extensionLimpia}` : baseLimpia;
}

/**
 * Clave definitiva del objeto: `carpeta/AAAA/MM/<uuid>-<nombre-limpio>`.
 *
 * El UUID va por delante del nombre para que dos archivos con el mismo nombre
 * nunca se pisen — en R2 un PUT sobre una clave existente la sobrescribe sin
 * avisar. El tramo AAAA/MM mantiene el bucket navegable a mano.
 */
export function buildMediaKey(folder: MediaFolder, fileName: string): string {
  const ahora = new Date();
  const anio = ahora.getUTCFullYear();
  const mes = String(ahora.getUTCMonth() + 1).padStart(2, '0');

  return `${folder}/${anio}/${mes}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}
