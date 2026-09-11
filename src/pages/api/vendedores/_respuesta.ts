import { errorResponse } from '@shared/api/apiResponse';
import { VendedorError, type VendedorErrorCode } from '@shared/lib/productos/productoService';

// El guion bajo evita que Astro publique este archivo como ruta: es solo la
// traducción de errores compartida por index.ts y [id].ts.

const ESTADO: Record<VendedorErrorCode, number> = {
  NOMBRE_DUPLICADO: 409,
  CON_PRODUCTOS: 409,
  SIN_PERMISO: 403,
};

/** Los errores de negocio viajan con su mensaje (es para el administrador); el resto, como 500. */
export function respuestaDeError(error: unknown): Response {
  if (error instanceof VendedorError) return errorResponse(error.message, ESTADO[error.code]);
  return errorResponse((error as Error).message);
}
