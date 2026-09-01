// Veredictos de la auditoría de RLS — SPEC-908, Enmienda 1 (REQ-1016, REQ-1017).
//
// Lógica PURA: recibe respuestas ya obtenidas y decide qué significan. No hace
// red. Vive aparte de `sondas.mjs` por eso mismo: la decisión es lo que hay que
// poder probar sin un Supabase delante, y mezclarla con el `fetch` la volvía
// inalcanzable para un test.
//
// LA REGLA QUE SOSTIENE ESTE ARCHIVO: FALLA se reserva para lo que está roto.
// Una base sin datos no está rota, está vacía. Marcarla en rojo tiene un coste
// que no es cosmético — un gate que da rojo en todos los despliegues nuevos se
// termina ignorando, y con él se ignora el rojo que sí importaba.

/** Filas devueltas por PostgREST, o `null` si la respuesta no es una lista. */
function filas(respuesta) {
  return Array.isArray(respuesta?.datos) ? respuesta.datos : null;
}

/**
 * REQ-1016 — qué significa que `anon` no vea productos publicados.
 *
 * Antes esto devolvía FALLA con el detalle "¿RLS demasiado estricto?" en cuanto
 * la lista venía vacía. En una base recién creada eso es un diagnóstico
 * equivocado, y de los caros: empuja a aflojar las policies de un despliegue nuevo
 * cuando `BZ-80` dice que la lectura de `product` ya está **demasiado abierta**.
 * El gate proponía la corrección inversa a la correcta.
 *
 * Desde fuera, con la clave anónima, "cero publicados" **nunca** se puede
 * atribuir a las policies: es indistinguible de una tabla sin filas y de un
 * catálogo entero en borrador. Lo único que sí es un fallo es no poder preguntar.
 *
 * @param publicados respuesta a `product?status=eq.published`
 * @param total respuesta a `product` sin filtro, para separar "vacía" de "sin publicar"
 */
export function veredictoLecturaPublica(publicados, total) {
  if (!publicados?.ok) {
    return { estado: 'FALLA', detalle: publicados?.error ?? 'la petición no llegó' };
  }
  if (publicados.estado !== 200) {
    return { estado: 'FALLA', detalle: `PostgREST devolvió ${publicados.estado}` };
  }

  const visibles = filas(publicados);
  if (visibles === null) {
    return { estado: 'FALLA', detalle: 'PostgREST no devolvió una lista' };
  }
  if (visibles.length > 0) {
    return { estado: 'PASA', detalle: null, filas: visibles.length };
  }

  // Vacío. Queda decir cuál de los dos vacíos es, sin acusar a las policies.
  const todas = total?.ok && total.estado === 200 ? filas(total) : null;

  if (todas !== null && todas.length > 0) {
    return {
      estado: 'AVISO',
      detalle:
        `anon lee product (${todas.length} fila(s) en la muestra) pero ninguna con ` +
        'status=published: no hay catálogo publicado que leer',
    };
  }

  return {
    estado: 'AVISO',
    detalle:
      'la tabla product está vacía para anon: sin datos que leer, no se puede ' +
      'concluir nada sobre las policies (¿falta cargar el seed?)',
  };
}

/**
 * REQ-1017 — la premisa que el informe daba por supuesta y no decía.
 *
 * `sondas.mjs` documenta que una tabla "protegida" se reconoce por responder 200
 * con lista vacía, y que ese criterio **solo significa algo si la lectura pública
 * pasa**: sin filas visibles en ninguna parte, "vacío" es indistinguible de "sin
 * datos" y las sondas de protección no prueban nada.
 *
 * Esa dependencia estaba escrita en un comentario y no en la salida. Con la base
 * vacía, la auditoría imprimía once AVISO de protección que no sostenían nada, y
 * nada avisaba de ello.
 *
 * @returns el texto de la advertencia, o `null` si no hace falta.
 */
export function avisoNoConcluyente(resultados) {
  const ancla = resultados?.find((r) => r.id === 'TEST-P01');
  if (!ancla || ancla.estado === 'PASA') return null;

  return (
    'Las sondas de protección NO son concluyentes en esta ejecución: sin ninguna ' +
    'fila visible para anon, "200 con lista vacía" es indistinguible de una tabla ' +
    'sin filas. Cargá datos y volvé a auditar.'
  );
}
