import { getSupabase } from '@shared/lib/db/client';
import { logServerError } from '@shared/lib/errors/logServerError';

// Sonda de conectividad con Supabase. Implementa SPEC-903, contrato compartido.
//
// Vivía dentro de `src/pages/api/diagnostico.ts` como función privada. Se
// extrajo al añadir `GET /api/salud` (BZ-72): los dos endpoints necesitan la
// misma respuesta a la misma pregunta —"¿la base contesta?"— y dos copias se
// habrían separado a la primera.
//
// Es un adaptador, no lógica pura: hace I/O contra Supabase. Por eso devuelve un
// estado descriptivo en vez de lanzar.

export interface EstadoSupabase {
  ok: boolean;
  /** Nombre del error, no su mensaje: `MissingEnvError`, `InvalidEnvError`, `Error`. */
  motivo: string | null;
  /** Código de PostgrestError cuando la consulta llegó a la base y fue rechazada. */
  codigo: string | null;
}

/**
 * Consulta mínima y de sólo lectura contra una tabla que el catálogo ya usa.
 *
 * `head: true` pide únicamente las cabeceras: confirma credenciales, red y RLS
 * sin traer datos.
 *
 * Del error se conserva el NOMBRE y el código, nunca el mensaje — el mensaje
 * puede nombrar tablas o rutas internas y va sólo al log (Regla 4.3, motivo de
 * `BZ-14`).
 */
export async function probarSupabase(): Promise<EstadoSupabase> {
  try {
    const { error } = await getSupabase()
      .from('category')
      .select('id', { head: true, count: 'exact' });

    if (error) {
      logServerError({ contexto: 'api.diagnostico.supabase' }, error);
      return { ok: false, motivo: 'consulta-rechazada', codigo: error.code ?? null };
    }

    return { ok: true, motivo: null, codigo: null };
  } catch (error) {
    logServerError({ contexto: 'api.diagnostico.supabase' }, error);
    return { ok: false, motivo: (error as Error).name ?? 'Error', codigo: null };
  }
}
