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
 * Fuentes de no-determinismo, inyectables (SPEC-002 REQ-208).
 *
 * Existen porque la Constitución 6.1 prohíbe `new Date()` y `crypto.randomUUID()`
 * dentro de lógica pura: sin esto, la única forma de probar `buildMediaKey` es
 * congelar el reloj global, que es justo el test frágil que la Regla 5 prohíbe.
 *
 * Ambos campos son opcionales y traen su valor de siempre, así que las llamadas
 * de dos argumentos que ya existen no cambian (TEST-123).
 */
export interface MediaKeyDeps {
  /** Instante en que se construye la clave. Por defecto, ahora. */
  ahora?: () => Date;
  /** Generador del identificador único. Por defecto, `crypto.randomUUID()`. */
  nuevoId?: () => string;
}

/**
 * Clave definitiva del objeto: `carpeta/AAAA/MM/<uuid>-<nombre-limpio>`.
 *
 * El UUID va por delante del nombre para que dos archivos con el mismo nombre
 * nunca se pisen — en R2 un PUT sobre una clave existente la sobrescribe sin
 * avisar. El tramo AAAA/MM mantiene el bucket navegable a mano.
 *
 * Las fechas se leen en UTC a propósito. Barzol opera en UTC-5, y con hora
 * local una subida del 31 de diciembre por la noche se archivaría bajo el año
 * siguiente (TEST-122).
 */
export function buildMediaKey(
  folder: MediaFolder,
  fileName: string,
  deps: MediaKeyDeps = {}
): string {
  const instante = deps.ahora?.() ?? new Date(); // sdd:determinismo-ok REQ-208 valor-por-defecto-inyectable
  const id = deps.nuevoId?.() ?? crypto.randomUUID(); // sdd:determinismo-ok REQ-208 valor-por-defecto-inyectable

  const anio = instante.getUTCFullYear();
  const mes = String(instante.getUTCMonth() + 1).padStart(2, '0');

  return `${folder}/${anio}/${mes}/${id}-${sanitizeFileName(fileName)}`;
}
