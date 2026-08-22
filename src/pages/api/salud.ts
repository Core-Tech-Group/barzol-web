import type { APIRoute } from 'astro';
import {
  construirEstadoBasico,
  respuestaEstado,
} from '@shared/lib/diagnostico/estadoBasico';
import { probarSupabase } from '@shared/lib/diagnostico/probarSupabase';

// GET /api/salud — señal de vida pública y mínima. Implementa SPEC-903 REQ-941.
//
// Existe para que `/api/diagnostico` se pueda cerrar sin dejar al proyecto
// ciego. Devuelve tres cosas y ninguna describe la configuración del worker:
// si está vivo, qué commit corre y cuándo respondió.
//
// El commit es lo que necesita el humo para detectar un bundle obsoleto
// (SPEC-901 REQ-956) — la comprobación que `BZ-38` habría necesitado, cuando dos
// commits tardaron un día en publicarse sin que nadie lo notara.
//
// Responde 200 siempre, incluso cuando Supabase está caído: el estado real va en
// el campo `ok`. Un 500 acá se confundiría con el 500 que se está diagnosticando.

export const GET: APIRoute = async () => {
  const supabase = await probarSupabase();

  return respuestaEstado(construirEstadoBasico(supabase.ok));
};
