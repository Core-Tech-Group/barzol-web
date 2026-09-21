// SPEC-906 REQ-997 — guardia de responsive del panel de administración.
//
// El panel llegó a tener 3 media queries frente a las 18 de la landing porque
// nada avisaba: cada pantalla nueva nacía sin adaptar y nadie lo notaba hasta
// abrirla en un teléfono. Un documento que dice "acordate del móvil" no lo
// impide. Este módulo convierte tres invariantes concretos en un check.
//
// Lo que NO hace, y conviene tenerlo claro: no dice si el panel se ve bien. Eso
// necesita `BZ-74` (E2E con viewports) o una persona con un teléfono. Acá solo
// se vigilan las tres causas mecánicas de SPEC-906.

import { leer, listarArchivos } from './lectura.mjs';

const DIR_PANEL = 'src/admin';
const TOKENS = 'src/shared/styles/tokens.css';
const EXTENSIONES = ['.tsx', '.astro', '.css'];

/** Clases de `tokens.css` que gobiernan una rejilla desde fuera. */
const CLASES_REJILLA = ['bz-grid-cards', 'bz-cms-grid'];

/**
 * `100vh` en una caja del panel (REQ-990, INV-1).
 *
 * El contenido scrollea en un hijo con `overflow-y:auto` mientras el padre está
 * en `overflow:hidden`. En un navegador móvil con barra dinámica, `100vh` es la
 * altura MÁXIMA del viewport, no la visible: lo que queda debajo es inalcanzable
 * porque el padre no scrollea.
 *
 * Se acepta el respaldo `100vh` seguido de `100dvh`, que es la forma correcta:
 * quien no entienda la unidad se queda con el comportamiento de hoy. Ese
 * respaldo son **dos declaraciones**, y en CSS de verdad ocupan dos líneas —
 * mirar solo la línea del `100vh` daba un falso positivo en `tokens.css`.
 */
function vhSospechoso(ruta, fuente) {
  const hallazgos = [];
  const lineas = fuente.split('\n');

  lineas.forEach((linea, i) => {
    if (!/\b(min-height|height)\s*:\s*100vh\b/.test(linea)) return;

    const conRespaldo = `${linea}\n${lineas[i + 1] ?? ''}`;
    if (/100dvh/.test(conRespaldo)) return;

    hallazgos.push({
      tipo: 'RESPONSIVE-VH',
      archivo: ruta,
      detalle: 'usa 100vh — en móvil deja contenido fuera de alcance; usá 100dvh con 100vh de respaldo (SPEC-906 REQ-990)',
    });
  });

  return hallazgos;
}

/**
 * Rejilla de tres columnas sin clase que la baje en pantallas chicas
 * (REQ-993, INV-2).
 *
 * El valor en línea puede quedarse: es el de escritorio. Lo que hace falta es
 * que una clase de `tokens.css` pueda sobreescribirlo, porque los `<style>` de
 * Astro son scoped y un componente no puede declarar su propia media query sin
 * duplicar el punto de ruptura.
 */
function rejillaFija(ruta, fuente) {
  const hallazgos = [];
  const lineas = fuente.split('\n');

  lineas.forEach((linea, i) => {
    if (!/repeat\(\s*3\s*,\s*1fr\s*\)/.test(linea)) return;

    // La clase puede estar en la misma línea o en las dos anteriores, según
    // cómo haya quedado el formato del JSX.
    const contexto = lineas.slice(Math.max(0, i - 2), i + 1).join('\n');
    if (CLASES_REJILLA.some((c) => contexto.includes(c))) return;

    hallazgos.push({
      tipo: 'RESPONSIVE-GRID',
      archivo: ruta,
      detalle: `rejilla de 3 columnas sin clase responsive — añadí ${CLASES_REJILLA[0]} (SPEC-906 REQ-993)`,
    });
  });

  return hallazgos;
}

/**
 * Punto de ruptura escrito como literal fuera de `tokens.css` (REQ-995, INV-3).
 *
 * Es la lección que la landing ya aprendió y el panel no: `tokens.css` lo
 * documenta desde antes de esta SPEC —"si cada uno redeclarara esta regla,
 * tendríamos la misma media query repetida en varios archivos"— y el panel la
 * tenía repetida en dos.
 */
function breakpointSuelto(ruta, fuente) {
  if (ruta.replace(/\\/g, '/') === TOKENS) return [];

  return /@media[^{]*\b\d{3,4}px\b/.test(fuente)
    ? [
        {
          tipo: 'RESPONSIVE-BP',
          archivo: ruta,
          detalle: 'punto de ruptura literal — las utilidades del panel van en tokens.css (SPEC-906 REQ-995)',
        },
      ]
    : [];
}

/** Revisa una fuente ya leída. Separada para poder probarla sin tocar disco. */
export function revisarFuente(ruta, fuente) {
  const normalizada = ruta.replace(/\\/g, '/');

  // Solo el panel y su hoja de tokens. La landing resolvió esto a su manera,
  // con 18 media queries repartidas, y cambiarle el criterio no es lo que pide
  // SPEC-906.
  const esPanel = normalizada.startsWith(DIR_PANEL);
  const esTokens = normalizada === TOKENS;
  if (!esPanel && !esTokens) return [];

  return [
    ...vhSospechoso(normalizada, fuente),
    ...rejillaFija(normalizada, fuente),
    ...breakpointSuelto(normalizada, fuente),
  ];
}

/** Revisa el panel entero contra el disco. */
export function revisarPanel() {
  const archivos = [
    ...listarArchivos(DIR_PANEL, (r) => EXTENSIONES.some((e) => r.endsWith(e))),
    TOKENS,
  ];

  const fuentes = Object.fromEntries(
    archivos.map((ruta) => [ruta.replace(/\\/g, '/'), leer(ruta)])
  );

  return [
    ...archivos.flatMap((ruta) => revisarFuente(ruta, leer(ruta))),
    ...revisarContrato(fuentes[TOKENS] ?? '', fuentes),
  ];
}

/**
 * Contrato entre `tokens.css` y las pantallas que dependen de él
 * (REQ-991, REQ-992, REQ-994).
 *
 * Las utilidades del panel funcionan solo si se cumplen dos cosas a la vez: la
 * regla existe en `tokens.css` y la clase está puesta en el marcado. Cualquiera
 * de las dos se puede borrar sin que nada se queje —el CSS no avisa de un
 * selector que no encuentra a nadie, ni el JSX de una clase que no existe— y el
 * síntoma aparece en un teléfono, semanas después.
 */
const CONTRATO = [
  { clase: 'bz-split-auth', archivo: 'src/admin/login/LoginView.astro', req: 'REQ-991' },
  { clase: 'bz-auth-brand', archivo: 'src/admin/login/LoginView.astro', req: 'REQ-991' },
  { clase: 'bz-table-head', archivo: 'src/admin/productos/ProductsAdminList.tsx', req: 'REQ-992' },
  { clase: 'bz-table-row', archivo: 'src/admin/productos/ProductsAdminList.tsx', req: 'REQ-992' },
  { clase: 'bz-admin-shell', archivo: 'src/admin/layout/AdminLayout.astro', req: 'REQ-990' },
];

/** Clases que `tokens.css` debe declarar aunque su uso esté repartido. */
const DECLARADAS = ['bz-topbar', 'bz-content-pad', 'bz-grid-cards'];

export function revisarContrato(tokens, archivos) {
  const hallazgos = [];
  const declara = (clase) => new RegExp(`\\.${clase}\\b`).test(tokens);

  for (const clase of [...DECLARADAS, ...CONTRATO.map((c) => c.clase)]) {
    if (declara(clase)) continue;
    hallazgos.push({
      tipo: 'RESPONSIVE-CLASE',
      archivo: TOKENS,
      detalle: `falta la regla .${clase} — hay marcado que la usa y se quedaría sin adaptar (SPEC-906)`,
    });
  }

  for (const { clase, archivo, req } of CONTRATO) {
    const fuente = archivos[archivo] ?? '';
    if (fuente.includes(clase)) continue;
    hallazgos.push({
      tipo: 'RESPONSIVE-CLASE',
      archivo,
      detalle: `no aplica .${clase}, así que tokens.css no puede adaptarlo (SPEC-906 ${req})`,
    });
  }

  // REQ-994 — la barra superior solo puede envolverse si tokens.css se lo
  // permite; el alto de 68px está en línea en las seis pantallas.
  if (!/\.bz-topbar\b[^}]*}/s.test(tokens) || !/flex-wrap/.test(tokens)) {
    hallazgos.push({
      tipo: 'RESPONSIVE-CLASE',
      archivo: TOKENS,
      detalle: 'la barra superior no puede envolver sus acciones: falta flex-wrap (SPEC-906 REQ-994)',
    });
  }

  return hallazgos;
}
