// Sondas de RLS contra un Supabase vivo, con el rol `anon`. Implementa la
// parte de SPEC-902 que se puede verificar sin levantar el stack local.
//
// SOLO LECTURA. Ni un `INSERT`, ni un `UPDATE`, ni un `DELETE`: estas sondas
// están pensadas para poder apuntarlas a producción sin pedir permiso a nadie,
// y eso solo es cierto mientras no escriban. Las pruebas de escritura son las
// de pgTAP (`BZ-70`), que corren contra un stack local y hacen rollback.
//
// La anon key no es un secreto: viaja al navegador en cada visita. Lo que estas
// sondas comprueban es precisamente qué puede hacer alguien que la tenga.

const TIMEOUT_MS = 15_000;

/** Consulta PostgREST con el rol anon. Nunca lanza. */
export async function consultar(base, clave, ruta) {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), TIMEOUT_MS);

  try {
    const respuesta = await fetch(`${base}/rest/v1/${ruta}`, {
      method: 'GET',
      signal: control.signal,
      headers: { apikey: clave, Authorization: `Bearer ${clave}` },
    });
    const texto = await respuesta.text();

    let datos = null;
    try {
      datos = JSON.parse(texto);
    } catch {
      /* PostgREST devuelve texto plano en algunos errores */
    }

    return { ok: true, estado: respuesta.status, datos, texto };
  } catch (error) {
    const agotado = error?.name === 'AbortError';
    return { ok: false, error: agotado ? 'tiempo agotado' : String(error?.message ?? error) };
  } finally {
    clearTimeout(corte);
  }
}

const pasa = (id, d) => ({ id, descripcion: d, estado: 'PASA', detalle: null });
const falla = (id, d, detalle) => ({ id, descripcion: d, estado: 'FALLA', detalle });
const aviso = (id, d, detalle) => ({ id, descripcion: d, estado: 'AVISO', detalle });

/**
 * Una tabla está protegida si PostgREST responde 401/403, o si responde 200
 * con lista vacía. Ojo con esto último: **vacío no prueba que RLS exista**.
 * Puede ser una tabla sin filas. Por eso las sondas que dependen de ver filas
 * (REQ-922) y las que dependen de no verlas (REQ-923) van juntas: si la de
 * lectura pública pasa, sabemos que la conexión funciona y que el vacío de la
 * otra significa algo.
 */
function protegida(r) {
  if (!r.ok) return false;
  if (r.estado === 401 || r.estado === 403) return true;
  return r.estado === 200 && Array.isArray(r.datos) && r.datos.length === 0;
}

/** REQ-922 — anon lee el catálogo publicado. */
export async function catalogoPublicoLegible(base, clave) {
  const id = 'TEST-P01';
  const d = 'anon lee productos publicados';
  const r = await consultar(base, clave, 'product?select=id,status&status=eq.published&limit=5');

  if (!r.ok) return falla(id, d, r.error);
  if (r.estado !== 200) return falla(id, d, `PostgREST devolvió ${r.estado}`);
  if (!Array.isArray(r.datos) || r.datos.length === 0) {
    return falla(id, d, 'no devolvió ningún producto publicado — ¿RLS demasiado estricto?');
  }

  return pasa(id, `${d} (${r.datos.length} filas)`);
}

/** REQ-923 — anon NO ve borradores. El requisito de más riesgo real. */
export async function borradoresOcultos(base, clave) {
  const id = 'TEST-P02';
  const d = 'anon NO ve productos en borrador';
  const r = await consultar(base, clave, 'product?select=id,name,status&status=eq.draft&limit=5');

  if (!r.ok) return falla(id, d, r.error);
  if (r.estado === 401 || r.estado === 403) return pasa(id, `${d} (rechazado con ${r.estado})`);
  if (r.estado !== 200) return falla(id, d, `PostgREST devolvió ${r.estado}`);

  if (Array.isArray(r.datos) && r.datos.length > 0) {
    return falla(id, d, `EXPUESTOS ${r.datos.length} borradores, p.ej. "${r.datos[0]?.name}"`);
  }

  // Vacío. Puede ser que RLS funcione o que no haya borradores. No se puede
  // distinguir desde fuera, y decir "PASA" sería mentir.
  return aviso(id, d, 'sin borradores visibles, pero no se puede distinguir de "no hay borradores"');
}

/** REQ-927 — anon NO lee `admin_profile`. */
export async function perfilesAdminOcultos(base, clave) {
  const id = 'TEST-P03';
  const d = 'anon NO lee admin_profile';
  const r = await consultar(base, clave, 'admin_profile?select=id&limit=5');

  if (!r.ok) return falla(id, d, r.error);
  if (r.estado === 401 || r.estado === 403) return pasa(id, `${d} (rechazado con ${r.estado})`);
  if (r.estado === 404) return pasa(id, `${d} (no expuesta por PostgREST)`);

  if (r.estado === 200 && Array.isArray(r.datos) && r.datos.length > 0) {
    return falla(id, d, `EXPUESTAS ${r.datos.length} filas de admin_profile`);
  }
  if (r.estado === 200) {
    return aviso(id, d, 'responde 200 con lista vacía: la tabla es alcanzable, revisar si tiene RLS');
  }

  return falla(id, d, `PostgREST devolvió ${r.estado}`);
}

/**
 * REQ-921 — RLS habilitado en todo el esquema.
 *
 * No se puede comprobar de verdad desde PostgREST: haría falta consultar
 * `pg_class.relrowsecurity`, que anon no alcanza. Lo que sí se puede es ver si
 * cada tabla responde lo que debería, y avisar de las que quedan fuera de la
 * comprobación. La verificación completa es pgTAP (`BZ-70`).
 */
export async function tablasAlcanzables(base, clave, tablas) {
  const resultados = [];

  for (const tabla of tablas) {
    const r = await consultar(base, clave, `${tabla}?select=*&limit=1`);
    const id = `TEST-P10.${tabla}`;
    const d = `alcance de anon sobre ${tabla}`;

    if (!r.ok) {
      resultados.push(falla(id, d, r.error));
      continue;
    }
    if (r.estado === 200 && Array.isArray(r.datos)) {
      resultados.push(
        aviso(id, d, `legible por anon (${r.datos.length} fila(s) en la muestra)`)
      );
      continue;
    }
    resultados.push(pasa(id, `${d} — rechazado con ${r.estado}`));
  }

  return resultados;
}
