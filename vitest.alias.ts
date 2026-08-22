import { fileURLToPath } from 'node:url';

/**
 * Alias de importación compartidos por las dos configuraciones de Vitest.
 *
 * Duplican los `paths` de `tsconfig.json`, y ese es el punto delicado: son dos
 * listas que describen lo mismo y pueden separarse. Viven acá, en un solo
 * archivo, para que al menos no sean TRES —una por config— y para que el día
 * que se añada un alias haya un único sitio que tocar.
 *
 * Hacen falta porque los tests importan código de producción (`src/pages/api/**`)
 * que sí usa los alias. Sin esto, el runner falla con
 * `Cannot find package '@shared/api/apiResponse'`, que es lo que ocurrió al
 * montar el primer test de endpoint (`BZ-59`).
 */
const desdeRaiz = (ruta: string) => fileURLToPath(new URL(ruta, import.meta.url));

export const alias = {
  '@shared': desdeRaiz('./src/shared'),
  '@landing': desdeRaiz('./src/landing'),
  '@admin': desdeRaiz('./src/admin'),
  '@': desdeRaiz('./src'),
};
