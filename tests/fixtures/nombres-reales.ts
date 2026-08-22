/**
 * Corpus de nombres reales del catálogo, exigido por el PLAN de SPEC-003.
 *
 * Sale de `BARZOL_CONTEXTO.md` y del menú del sitio. Sirve para comprobar que
 * el `slugify()` unificado produce EXACTAMENTE las mismas rutas que las dos
 * copias que reemplaza — el slug es la URL pública y no se persiste, así que
 * cualquier diferencia rompe enlaces vivos sin migración posible.
 *
 * Añadir un nombre no requiere enmendar la SPEC. Quitarlo, sí.
 */

/** Categorías e instrumentos del menú de navegación. */
export const NOMBRES_CATEGORIA = [
  'Soportes',
  'Sordinas',
  'Trompeta',
  'Trombón',
  'Tuba',
  'Euphonium',
] as const;

/** Productos reales, con sus tildes y paréntesis tal como se administran. */
export const NOMBRES_PRODUCTO = [
  'Atril de celular para trombón (tudel delgado)',
  'Atril de celular para trombón (tudel ancho)',
  'Atril de celular para tuba (tudel ancho: King/Yamaha/Jupiter)',
  'Atril de celular para tuba (tudel delgado: fabricadas en Perú)',
  'Sordina silenciador para trombón',
  'Sordina silenciador para trompeta',
  'BERP (para trombón, trompeta y euphonium)',
] as const;

/**
 * Bordes que el PLAN exige cubrir. El resultado esperado de los tres primeros
 * es la cadena vacía, y eso es contrato (REQ-304), no accidente.
 */
export const NOMBRES_BORDE = [
  '',
  '!!!',
  '   ',
  '  Soportes  ',
  'Sordina    trompeta',
  'soporte--celular',
  'Barzol 3D Industry',
  'Piñón güiro',
  'BERP / trompeta & trombón',
] as const;

/** Todo junto, para las pruebas de invariantes y de equivalencia. */
export const CORPUS: readonly string[] = [
  ...NOMBRES_CATEGORIA,
  ...NOMBRES_PRODUCTO,
  ...NOMBRES_BORDE,
];
