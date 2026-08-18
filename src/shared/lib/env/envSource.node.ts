// Origen crudo de las variables de entorno cuando el sitio corre sobre Node
// dentro de Docker (objetivo de despliegue `node`, usado por el despliegue
// local de la Orange Pi detrás del túnel de Cloudflare Zero Trust).
//
// Contraparte de `envSource.cloudflare.ts`: misma interfaz, otro origen. Ver la
// ficha OP-04 del kanban de despliegue local para por qué la selección ocurre
// en el build y no en tiempo de ejecución.
//
// Acá `process.env` SÍ es la fuente correcta y no contradice la regla del
// proyecto: la prohibición de `process.env` aplica al build de Cloudflare, donde
// se compila a un objeto vacío. En Node lo puebla `docker-compose` al arrancar
// el contenedor. La regla que no cambia es que las variables se leen siempre a
// través de `serverEnv.ts`, nunca con `import.meta.env.BARZOL_*`, que Vite
// congelaría con el valor de build time.

/**
 * Configuración del proyecto tomada del entorno del proceso, **filtrada al
 * prefijo `BARZOL_`**.
 *
 * El filtro no es cosmético. `GET /api/diagnostico` publica los NOMBRES de todo
 * lo que ve esta función (nunca los valores, ver `listarClavesEnv`), y ese
 * endpoint queda accesible desde el túnel público. Sin filtrar, un `process.env`
 * de contenedor expondría también `PATH`, `HOSTNAME`, `NODE_VERSION` y
 * cualquier variable que se agregue al servicio en el futuro. Acotarlo acá deja
 * el diagnóstico contando exactamente lo mismo que cuenta en Cloudflare: qué
 * variables del proyecto llegaron.
 *
 * No recorta nada que la aplicación necesite: `serverEnv.ts` sólo se consulta
 * con nombres `BARZOL_*` (es la convención de nombres del proyecto), y `HOST` /
 * `PORT` los lee el adaptador de Node directamente, sin pasar por acá.
 *
 * Tampoco hay bindings de plataforma en este objetivo: `hayBinding('MEDIA')`
 * devuelve `false`, que es la respuesta correcta — el multimedia se escribe en
 * disco y no en R2 (ver `mediaDriver.node.ts`).
 */
export function getEnvRecord(): Record<string, unknown> {
  const resultado: Record<string, unknown> = {};

  for (const [clave, valor] of Object.entries(process.env)) {
    if (clave.startsWith('BARZOL_')) resultado[clave] = valor;
  }

  return resultado;
}
