// Sondas de SPEC-901. Solo lectura: `GET` y `HEAD`, nunca otra cosa (REQ-961).
//
// Cada sonda devuelve { id, descripcion, estado, detalle } y NUNCA lanza: el
// informe tiene que llegar entero aunque una falle (REQ-959).

const TIMEOUT_MS = 10_000;

/** `fetch` con límite de tiempo (REQ-958). Nunca lanza. */
export async function pedir(url, { metodo = 'GET', token } = {}) {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), TIMEOUT_MS);
  const inicio = Date.now();

  try {
    const respuesta = await fetch(url, {
      method: metodo,
      redirect: 'follow',
      signal: control.signal,
      headers: token ? { 'x-diagnostico-token': token } : {},
    });
    const cuerpo = metodo === 'HEAD' ? '' : await respuesta.text();

    return { ok: true, estado: respuesta.status, cabeceras: respuesta.headers, cuerpo, ms: Date.now() - inicio };
  } catch (error) {
    const agotado = error?.name === 'AbortError';
    return {
      ok: false,
      ms: Date.now() - inicio,
      error: agotado ? `tiempo agotado tras ${TIMEOUT_MS} ms` : String(error?.message ?? error),
    };
  } finally {
    clearTimeout(corte);
  }
}

const pasa = (id, descripcion, ms) => ({ id, descripcion, estado: 'PASA', detalle: null, ms });
const falla = (id, descripcion, detalle, ms) => ({ id, descripcion, estado: 'FALLA', detalle, ms });

/** REQ-952 — la portada responde HTML. */
export async function portadaViva(base) {
  const id = 'TEST-S01';
  const d = 'portada responde 200 con HTML';
  const r = await pedir(base);

  if (!r.ok) return falla(id, d, r.error, r.ms);
  if (r.estado !== 200) return falla(id, d, `estado ${r.estado}`, r.ms);

  const tipo = r.cabeceras.get('content-type') ?? '';
  if (!tipo.includes('text/html')) return falla(id, d, `content-type ${tipo}`, r.ms);

  return pasa(id, d, r.ms);
}

/**
 * REQ-953 — el catálogo devuelve productos reales.
 *
 * El slug NO va fijo: se descubre desde la portada. Una ruta fija se queda
 * obsoleta en cuanto alguien renombra una categoría en el panel —y el slug se
 * recalcula desde el nombre, así que pasa más de lo que parece (ver SPEC-003).
 */
export async function catalogoConDatos(base) {
  const id = 'TEST-S02';
  const d = 'una ruta de catálogo devuelve productos';

  const portada = await pedir(base);
  if (!portada.ok) return falla(id, d, `no se pudo leer la portada: ${portada.error}`, portada.ms);

  const enlace = portada.cuerpo.match(/href="(\/catalogo\/[^"#?]+)"/);
  if (!enlace) return falla(id, d, 'la portada no enlaza ninguna ruta /catalogo/', portada.ms);

  const r = await pedir(new URL(enlace[1], base).toString());
  if (!r.ok) return falla(id, d, r.error, r.ms);
  if (r.estado !== 200) return falla(id, d, `${enlace[1]} devolvió ${r.estado}`, r.ms);

  // Si Supabase no responde, la página se sirve igual pero sin fichas.
  if (!/\/producto\//.test(r.cuerpo)) {
    return falla(id, d, `${enlace[1]} respondió 200 pero sin ningún producto`, r.ms);
  }

  return pasa(id, `${d} (${enlace[1]})`, r.ms);
}

/** REQ-954 — el 404 propio, no el genérico de Astro. */
export async function paginaNoEncontrada(base) {
  const id = 'TEST-S03';
  const d = '404 servido por la página propia';
  // Sufijo aleatorio: una ruta fija podría llegar a existir, y el test se
  // pondría verde por el motivo equivocado.
  const ruta = `/no-existe-${Math.random().toString(36).slice(2, 10)}`;
  const r = await pedir(new URL(ruta, base).toString());

  if (!r.ok) return falla(id, d, r.error, r.ms);
  if (r.estado !== 404) return falla(id, d, `estado ${r.estado}, se esperaba 404`, r.ms);
  if (/Not found/i.test(r.cuerpo) && !/[áéíóúñ¿¡]/i.test(r.cuerpo)) {
    return falla(id, d, 'parece el 404 por defecto de Astro, no el propio', r.ms);
  }

  return pasa(id, d, r.ms);
}

/** REQ-955 y REQ-956 — diagnóstico sano, claves presentes y commit correcto. */
export async function diagnostico(base, { token, commit } = {}) {
  const url = new URL('/api/diagnostico', base).toString();
  const r = await pedir(url, { token });
  const ms = r.ms;

  if (!r.ok) {
    const e = falla('TEST-S04', 'diagnóstico accesible', r.error, ms);
    return [e, { ...e, id: 'TEST-S05' }, { ...e, id: 'TEST-S06' }];
  }
  if (r.estado !== 200) {
    const e = falla('TEST-S04', 'diagnóstico accesible', `estado ${r.estado}`, ms);
    return [e, { ...e, id: 'TEST-S05' }, { ...e, id: 'TEST-S06' }];
  }

  let datos;
  try {
    datos = JSON.parse(r.cuerpo);
  } catch {
    const e = falla('TEST-S04', 'diagnóstico accesible', 'la respuesta no es JSON', ms);
    return [e, { ...e, id: 'TEST-S05' }, { ...e, id: 'TEST-S06' }];
  }

  return [sano(datos, ms), clavesPresentes(datos, ms), commitDesplegado(datos, commit, ms)];
}

function sano(datos, ms) {
  const id = 'TEST-S04';
  const d = 'diagnóstico reporta el worker sano';
  const problemas = [];

  if (datos.ok !== true) problemas.push('ok=false');
  if (datos.supabase?.ok !== true) {
    problemas.push(`supabase.ok=false (${datos.supabase?.motivo ?? 'sin motivo'})`);
  }
  for (const binding of ['MEDIA', 'ASSETS']) {
    if (datos.bindings?.[binding] !== true) problemas.push(`falta el binding ${binding}`);
  }

  return problemas.length ? falla(id, d, problemas.join('; '), ms) : pasa(id, d, ms);
}

function clavesPresentes(datos, ms) {
  const id = 'TEST-S05';
  const d = 'el worker recibe las tres variables';
  const esperadas = ['BARZOL_SUPABASE_URL', 'BARZOL_SUPABASE_ANON_KEY', 'BARZOL_R2_PUBLIC_URL'];
  const recibidas = datos.clavesRecibidas ?? [];
  const ausentes = esperadas.filter((c) => !recibidas.includes(c));

  return ausentes.length ? falla(id, d, `ausentes: ${ausentes.join(', ')}`, ms) : pasa(id, d, ms);
}

/**
 * REQ-956 — la sonda de mayor valor del conjunto.
 *
 * `BZ-38`: dos commits tardaron un día en publicarse y nadie lo notó. Un campo
 * ausente cuenta como FALLO, no como sonda omitida: si se saltara, la
 * comprobación se desactivaría sola justo cuando corre un bundle viejo que
 * todavía no informaba el commit.
 */
function commitDesplegado(datos, esperado, ms) {
  const id = 'TEST-S06';
  const d = 'el commit desplegado es el que se acaba de publicar';

  const informado = datos.commit ?? datos.build?.commit ?? null;
  if (!informado) return falla(id, d, 'el diagnóstico no informa ningún commit', ms);
  if (!esperado) return pasa(id, `${d} — sin --commit, solo se informa: ${informado}`, ms);

  const iguales = informado.startsWith(esperado.slice(0, 7)) || esperado.startsWith(informado.slice(0, 7));

  return iguales
    ? pasa(id, d, ms)
    : falla(id, d, `producción sirve ${informado}, se esperaba ${esperado}`, ms);
}

/**
 * REQ-957 — una imagen real se sirve desde R2.
 *
 * La URL se descubre en la portada, no se fija en el script ni se lee del
 * diagnóstico. Fijarla ataría la sonda a un producto concreto: el día que se
 * borrara, fallaría por el motivo equivocado. Y el diagnóstico no sirve —
 * publica los NOMBRES de las variables que recibe, no sus valores, que es
 * justo lo que debe hacer.
 */
export async function imagenDesdeR2(base) {
  const id = 'TEST-S07';
  const d = 'una imagen de producto se sirve desde R2';

  const portada = await pedir(base);
  if (!portada.ok) return falla(id, d, `no se pudo leer la portada: ${portada.error}`, portada.ms);

  const img = portada.cuerpo.match(/https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^"'\s)]+/);
  if (!img) return falla(id, d, 'la portada no referencia ninguna imagen de R2', portada.ms);

  const r = await pedir(img[0], { metodo: 'HEAD' });
  if (!r.ok) return falla(id, d, r.error, r.ms);
  if (r.estado !== 200) return falla(id, d, `${img[0]} devolvió ${r.estado}`, r.ms);

  return pasa(id, d, r.ms);
}
