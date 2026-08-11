import { requireServerEnv } from '@shared/lib/env/serverEnv';

// URL pública de lectura de un objeto de R2.
//
// El binding sirve para ESCRIBIR desde el worker, pero no expone las imágenes al
// visitante. Para eso el bucket necesita una base pública propia — su subdominio
// `r2.dev` o, mejor, un dominio del proyecto — y esa base es lo único de R2 que
// vive como variable de entorno.
//
// Se resuelve de forma perezosa: si se leyera en el cuerpo del módulo, un
// despliegue sin la variable tumbaría también las páginas que no muestran
// imágenes.

/** Construye la URL pública a partir de la clave del objeto. */
export function buildPublicUrl(key: string): string {
  const { BARZOL_R2_PUBLIC_URL } = requireServerEnv(['BARZOL_R2_PUBLIC_URL']);
  return `${BARZOL_R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;
}
