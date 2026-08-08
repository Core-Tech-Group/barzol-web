import type { ZodError } from 'zod';

// Traduce un `ZodError` al texto que viaja en `ApiResponse.message`.
//
// Vive aparte porque lo va a necesitar cada endpoint que valide entrada, y
// porque el formato del mensaje de error es parte del contrato de la API: si
// cambia, tiene que cambiar en un solo lugar.

/**
 * Aplana los problemas de validación a una línea legible:
 * `carpeta: valor inválido; nombreArchivo: requerido`.
 *
 * Solo refleja lo que el cliente mandó — nunca incluye estado interno.
 */
export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const campo = issue.path.map(String).join('.');
      return campo ? `${campo}: ${issue.message}` : issue.message;
    })
    .join('; ');
}
