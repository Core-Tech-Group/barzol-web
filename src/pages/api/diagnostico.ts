import type { APIRoute } from 'astro';
import {
  inspeccionarVariable,
  hayBinding,
  listarClavesEnv,
  readServerEnv,
  type InspeccionVariable,
} from '@shared/lib/env/serverEnv';
import { buscarNombresParecidos } from '@shared/lib/env/nombresParecidos';
import { getBuildInfo, type BuildInfo } from '@shared/lib/build/buildInfo';
import { CABECERA_TOKEN, resolverNivelAcceso } from '@shared/lib/diagnostico/acceso';
import {
  construirEstadoBasico,
  respuestaEstado,
  type EstadoBasico,
} from '@shared/lib/diagnostico/estadoBasico';
import { probarSupabase, type EstadoSupabase } from '@shared/lib/diagnostico/probarSupabase';

// Rastreo de la configuración del worker DESPLEGADO, sin abrir el panel ni tener
// wrangler instalado: `GET /api/diagnostico`.
//
// Existe porque el log de despliegue no sirve para esto. Ese log termina en
// "Success" aunque el sitio esté caído: sólo cuenta que el bundle se subió, no
// qué configuración recibe el worker al atender una petición. Las dos caídas del
// 2026-08-12 y 2026-08-13 tuvieron despliegues verdes.
//
// DOS reglas lo hacen seguro incluso ante quien logre leerlo:
//
// 1. No devuelve NINGÚN valor de variable — sólo si está, cuánto mide y qué la
//    invalida (ver `inspeccionarVariable`). Un diagnóstico que filtra la clave
//    que diagnostica no sirve de nada.
// 2. De los errores devuelve el NOMBRE y el código, nunca el mensaje: el
//    mensaje puede nombrar tablas o rutas internas y va al log.
//
// Aun así NO se deja público (SPEC-903, BZ-72): los nombres de las variables
// recibidas, los bindings presentes y el SHA desplegado son, juntos, un mapa
// para quien busque por dónde entrar. El acceso lo decide
// `resolverNivelAcceso`, y hay tres niveles para que cerrarlo no deje al
// proyecto sin su primera parada de diagnóstico.
//
// Responde 200 siempre, incluso cuando todo falla. Un 500 acá se confundiría con
// el 500 que se está diagnosticando; el estado real va en el campo `ok`.

const VARIABLES = [
  'BARZOL_SUPABASE_URL',
  'BARZOL_SUPABASE_ANON_KEY',
  'BARZOL_R2_PUBLIC_URL',
] as const;

const BINDINGS = ['MEDIA', 'SESSION', 'IMAGES', 'ASSETS'] as const;

// Extiende el cuerpo reducido en vez de repetir sus campos: así INV-4 —que lo
// reducido sea un subconjunto estricto de lo completo— la sostiene el compilador
// y no la buena memoria de quien edite esto dentro de seis meses.
interface Diagnostico extends EstadoBasico {
  /** Qué commit generó el bundle que está respondiendo, con su fecha de build. */
  build: BuildInfo;
  variables: Record<string, InspeccionVariable>;
  /**
   * Nombres de TODAS las variables de texto que recibió el worker, incluidas
   * las que no se esperaban. Sin valores. Es lo que permite distinguir "no se
   * cargó" de "se cargó con otro nombre".
   */
  clavesRecibidas: string[];
  bindings: Record<string, boolean>;
  supabase: EstadoSupabase;
  pistas: string[];
}

// Traduce los hechos a la acción concreta que corresponde. Es la parte que
// convierte el endpoint en un diagnóstico y no en un volcado de estado.
function armarPistas(
  variables: Record<string, InspeccionVariable>,
  clavesRecibidas: readonly string[],
  bindings: Record<string, boolean>,
  supabase: EstadoSupabase
): string[] {
  const pistas: string[] = [];

  const ausentes = Object.entries(variables)
    .filter(([, v]) => !v.presente)
    .map(([nombre]) => nombre);

  // Antes que nada: si falta una y llegó otra parecida, el problema es el
  // nombre y no el valor. Va primero porque cambia por completo qué hacer.
  for (const nombre of ausentes) {
    const parecidas = buscarNombresParecidos(nombre, clavesRecibidas);
    if (parecidas.length > 0) {
      pistas.push(
        `${nombre} no llegó, pero sí llegó ${parecidas.join(', ')}. El nombre está mal ` +
          'escrito o quedó cortado al guardarlo: corregilo en el panel en vez de volver ' +
          'a cargar el valor.'
      );
    }
  }

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

    // BARZOL_SUPABASE_ANON_KEY es la única que vive como Secret: las otras dos
    // las declara wrangler.jsonc y llegan solas. Si es la que falta, el
    // problema está en el panel y no en el repositorio.
    if (ausentes.includes('BARZOL_SUPABASE_ANON_KEY')) {
      pistas.push(
        'BARZOL_SUPABASE_ANON_KEY debe cargarse con tipo **Secret**, no Variable: ' +
          'las variables de texto del panel se borran en cada `wrangler deploy`, los ' +
          'secretos no. Verificá también que el nombre esté completo — el panel recorta ' +
          'los nombres largos en pantalla y `..._ANON_` se ve igual que `..._ANON_KEY`.'
      );
    }
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

// Pista que se devuelve mientras el token no esté configurado, para que el
// propio endpoint explique qué falta en vez de dejar a alguien adivinando por
// qué ya no ve el detalle que veía ayer.
const PISTA_SIN_TOKEN =
  'Diagnóstico en modo reducido: no hay BARZOL_DIAGNOSTICO_TOKEN configurado. ' +
  'Cargalo con `npx wrangler secret put BARZOL_DIAGNOSTICO_TOKEN` y volvé a pedir ' +
  'esta ruta con la cabecera `x-diagnostico-token` para ver la configuración completa.';

export const GET: APIRoute = async ({ request }) => {
  // SPEC-903: cuánto puede ver quien pregunta se decide ANTES de reunir nada.
  // Reunir primero y filtrar después es cómo se filtra un campo por descuido.
  const nivel = resolverNivelAcceso({
    tokenConfigurado: readServerEnv('BARZOL_DIAGNOSTICO_TOKEN'),
    tokenPresentado: request.headers.get(CABECERA_TOKEN),
  });

  // REQ-944 — 404 y no 403: un 403 confirma que la ruta existe.
  if (nivel === 'oculto') return new Response(null, { status: 404 });

  const supabase = await probarSupabase();

  // REQ-942 — sin token configurado, lo mismo que /api/salud más la pista.
  if (nivel === 'reducido') {
    return respuestaEstado({ ...construirEstadoBasico(supabase.ok), pistas: [PISTA_SIN_TOKEN] });
  }

  const variables = Object.fromEntries(VARIABLES.map((n) => [n, inspeccionarVariable(n)]));
  const clavesRecibidas = listarClavesEnv();
  const bindings = Object.fromEntries(BINDINGS.map((n) => [n, hayBinding(n)]));
  const basico = construirEstadoBasico(
    supabase.ok && Object.values(variables).every((v) => v.presente && !v.problemas?.length)
  );

  const cuerpo: Diagnostico = {
    ...basico,
    build: getBuildInfo(),
    variables,
    clavesRecibidas,
    bindings,
    supabase,
    pistas: armarPistas(variables, clavesRecibidas, bindings, supabase),
  };

  return respuestaEstado(cuerpo);
};
