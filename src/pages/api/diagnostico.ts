import type { APIRoute } from 'astro';
import { inspeccionarVariable, hayBinding, type InspeccionVariable } from '@shared/lib/env/serverEnv';
import { getSupabase } from '@shared/lib/db/client';
import { logServerError } from '@shared/lib/errors/logServerError';
import { getBuildInfo, type BuildInfo } from '@shared/lib/build/buildInfo';

// Rastreo de la configuración del worker DESPLEGADO, sin abrir el panel ni tener
// wrangler instalado: `GET /api/diagnostico`.
//
// Existe porque el log de despliegue no sirve para esto. Ese log termina en
// "Success" aunque el sitio esté caído: sólo cuenta que el bundle se subió, no
// qué configuración recibe el worker al atender una petición. Las dos caídas del
// 2026-08-12 y 2026-08-13 tuvieron despliegues verdes.
//
// DOS reglas lo hacen seguro de dejar expuesto:
//
// 1. No devuelve NINGÚN valor de variable — sólo si está, cuánto mide y qué la
//    invalida (ver `inspeccionarVariable`). Un diagnóstico que filtra la clave
//    que diagnostica no sirve de nada.
// 2. De los errores devuelve el NOMBRE y el código, nunca el mensaje: el
//    mensaje puede nombrar tablas o rutas internas y va al log.
//
// Responde 200 siempre, incluso cuando todo falla. Un 500 acá se confundiría con
// el 500 que se está diagnosticando; el estado real va en el campo `ok`.

const VARIABLES = [
  'BARZOL_SUPABASE_URL',
  'BARZOL_SUPABASE_ANON_KEY',
  'BARZOL_R2_PUBLIC_URL',
] as const;

const BINDINGS = ['MEDIA', 'SESSION', 'IMAGES', 'ASSETS'] as const;

interface EstadoSupabase {
  ok: boolean;
  /** Nombre del error, no su mensaje: `MissingEnvError`, `InvalidEnvError`, `Error`. */
  motivo: string | null;
  /** Código de PostgrestError cuando la consulta llegó a la base y fue rechazada. */
  codigo: string | null;
}

interface Diagnostico {
  ok: boolean;
  momento: string;
  /** Qué commit generó el bundle que está respondiendo. */
  build: BuildInfo;
  variables: Record<string, InspeccionVariable>;
  bindings: Record<string, boolean>;
  supabase: EstadoSupabase;
  pistas: string[];
}

// Consulta mínima y de sólo lectura contra una tabla que el catálogo ya usa.
// `head: true` pide únicamente las cabeceras: confirma credenciales, red y RLS
// sin traer datos.
async function probarSupabase(): Promise<EstadoSupabase> {
  try {
    const { error } = await getSupabase().from('category').select('id', { head: true, count: 'exact' });

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

// Traduce los hechos a la acción concreta que corresponde. Es la parte que
// convierte el endpoint en un diagnóstico y no en un volcado de estado.
function armarPistas(
  variables: Record<string, InspeccionVariable>,
  bindings: Record<string, boolean>,
  supabase: EstadoSupabase
): string[] {
  const pistas: string[] = [];

  const ausentes = Object.entries(variables)
    .filter(([, v]) => !v.presente)
    .map(([nombre]) => nombre);

  if (ausentes.length === VARIABLES.length) {
    pistas.push(
      'NINGUNA variable llegó al worker. Si estaban cargadas en el panel, el despliegue ' +
        'las borró: `wrangler deploy` trata wrangler.jsonc como fuente de verdad y elimina ' +
        'las variables definidas fuera de él. Se corrige con `keep_vars: true` en ' +
        'wrangler.jsonc y volviendo a cargarlas.'
    );
  } else if (ausentes.length > 0) {
    pistas.push(
      `Faltan ${ausentes.join(', ')} en Workers & Pages → barzol-web → Settings → ` +
        'Variables and Secrets. Hay que redesplegar después de guardarlas.'
    );
  }

  for (const [nombre, v] of Object.entries(variables)) {
    if (!v.problemas?.length) continue;

    if (v.problemas.includes('corchetes-de-markdown')) {
      pistas.push(
        `${nombre} tiene corchetes: se pegó como enlace de markdown, ` +
          '`[https://...](https://...)`, en vez de la URL en crudo.'
      );
    }
    if (v.problemas.includes('comillas')) {
      pistas.push(`${nombre} tiene comillas dentro del valor; en el panel se carga sin comillas.`);
    }
    if (v.problemas.includes('espacios-internos') || v.problemas.includes('salto-de-linea')) {
      pistas.push(`${nombre} tiene espacios o saltos de línea: el copiado arrastró texto de más.`);
    }
    if (v.problemas.includes('no-es-url-http')) {
      pistas.push(`${nombre} no es una URL absoluta http(s); debe empezar por https://`);
    }
    if (v.problemas.includes('barra-final')) {
      pistas.push(`${nombre} termina en barra. No rompe nada, pero conviene quitarla.`);
    }
  }

  const bindingsAusentes = Object.entries(bindings)
    .filter(([, presente]) => !presente)
    .map(([nombre]) => nombre);

  if (bindingsAusentes.length > 0) {
    pistas.push(
      `Bindings ausentes: ${bindingsAusentes.join(', ')}. Se declaran en wrangler.jsonc ` +
        '(MEDIA) o los inyecta el adaptador de Astro (SESSION, IMAGES, ASSETS).'
    );
  }

  if (supabase.motivo === 'consulta-rechazada') {
    pistas.push(
      `Supabase respondió y rechazó la consulta (código ${supabase.codigo ?? 'sin código'}). ` +
        'Las variables llegan bien: mirá la clave anon o las policies de RLS. El mensaje ' +
        'completo está en los logs del worker.'
    );
  }

  if (pistas.length === 0) pistas.push('Sin problemas detectados: configuración completa y Supabase responde.');

  return pistas;
}

export const GET: APIRoute = async () => {
  const variables = Object.fromEntries(VARIABLES.map((n) => [n, inspeccionarVariable(n)]));
  const bindings = Object.fromEntries(BINDINGS.map((n) => [n, hayBinding(n)]));
  const supabase = await probarSupabase();

  const cuerpo: Diagnostico = {
    ok: supabase.ok && Object.values(variables).every((v) => v.presente && !v.problemas?.length),
    momento: new Date().toISOString(),
    build: getBuildInfo(),
    variables,
    bindings,
    supabase,
    pistas: armarPistas(variables, bindings, supabase),
  };

  return new Response(JSON.stringify(cuerpo, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Sin caché: la respuesta describe el estado de ESTE momento, y el punto es
      // volver a pedirla después de cada cambio en el panel.
      'Cache-Control': 'no-store',
    },
  });
};
