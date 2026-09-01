// Lectura del árbol de archivos para los gates SDD.
// Sin dependencias externas: solo `node:fs` y `node:path` (SPEC-900 INV-1).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lista recursiva de archivos bajo `dir` que cumplen `filtro`.
 * Devuelve rutas con separadores POSIX para que los informes se vean igual en
 * Windows y en CI — el gate se lee en los dos sitios.
 */
export function listarArchivos(dir, filtro = () => true, acumulado = []) {
  let entradas;
  try {
    entradas = readdirSync(dir);
  } catch {
    return acumulado; // el directorio no existe; quien llama decide si importa
  }

  for (const entrada of entradas) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      listarArchivos(ruta, filtro, acumulado);
    } else if (filtro(ruta)) {
      acumulado.push(ruta.split('\\').join('/'));
    }
  }

  return acumulado;
}

/** Contenido de un archivo, o cadena vacía si no se puede leer. */
export function leer(ruta) {
  try {
    return readFileSync(ruta, 'utf8');
  } catch {
    return '';
  }
}

/** Concatena el contenido de varios archivos. */
export function leerTodos(rutas) {
  return rutas.map((r) => leer(r)).join('\n');
}

/** ¿Existe el directorio y tiene al menos un archivo que cumpla el filtro? */
export function tieneArchivos(dir, filtro) {
  return listarArchivos(dir, filtro).length > 0;
}

/**
 * Estado declarado en la cabecera de una SPEC (`**Estado:** APROBADA`).
 * Devuelve 'APROBADA' | 'BORRADOR' | 'SUPERADA' | 'DESCONOCIDO'.
 *
 * Importa porque solo las SPEC aprobadas bloquean el gate: una spec en
 * borrador describe algo que todavía no se implementó, y exigirle tests
 * dejaría el gate en rojo permanente desde el primer día — que es la forma
 * más rápida de que el equipo aprenda a ignorarlo.
 */
export function estadoDeSpec(contenido) {
  const m = contenido.match(/\*\*Estado:\*\*\s*([A-ZÁÉÍÓÚ]+)/);
  return m ? m[1] : 'DESCONOCIDO';
}

/**
 * IDs `REQ-NNN` únicos presentes en un texto.
 *
 * Acepta tres o cuatro dígitos. Empezó aceptando solo tres, y con SPEC-908 el
 * proyecto pasó de los 999 requisitos: `REQ-1001` se truncaba a `REQ-100` y el
 * Gate 4 reclamaba tests para requisitos **que no existen en ninguna spec**.
 *
 * Un hueco falso con un ID inventado es peor que un hueco no detectado: no hay
 * nada que citar en un test para cerrarlo, así que el gate queda en rojo
 * permanente — y un gate que no se puede poner en verde se acaba desactivando.
 *
 * El límite superior es deliberado: sin él, `\d+` se tragaría el año de una
 * fecha o el número de una línea pegados a un `REQ-`.
 */
export function requisitosDe(contenido) {
  return [...new Set(contenido.match(/REQ-\d{3,4}/g) ?? [])].sort();
}
