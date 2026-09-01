import { describe, expect, it } from 'vitest';
// Los gates son .mjs sin tipos propios; TypeScript los resuelve igual, y se
// prueban como cualquier otro módulo (SPEC-900 INV-1).
import { veredictoLecturaPublica, avisoNoConcluyente } from '../../../scripts/rls/veredictos.mjs';
import { requisitosDe } from '../../../scripts/sdd/lectura.mjs';

/**
 * SPEC-908 Enmienda 1 — REQ-1016 y REQ-1017.
 *
 * **El veredicto es lógica pura y se prueba como tal.** La sonda que lo usa
 * habla con un Supabase vivo, y una prueba que dependiera de esa red mediría la
 * red. Lo que aquí se fija es la decisión: qué respuesta de PostgREST significa
 * "roto" y cuál significa "todavía no hay nada que mirar".
 *
 * Por qué importa la diferencia: TEST-P01 daba FALLA con el detalle "¿RLS
 * demasiado estricto?" en una base recién creada y vacía. Ese mensaje empuja a
 * aflojar las policies de un despliegue nuevo, y `BZ-80` dice que la lectura de
 * `product` ya está demasiado abierta, no demasiado cerrada. El gate proponía la
 * corrección inversa a la correcta.
 */

interface Respuesta {
  ok: boolean;
  estado?: number;
  datos?: unknown;
  error?: string;
}

interface Veredicto {
  estado: 'PASA' | 'FALLA' | 'AVISO';
  detalle: string | null;
}

const resp = (estado: number, datos: unknown): Respuesta => ({ ok: true, estado, datos });
const fila = { id: 1, status: 'published' };

describe('SPEC-908 · veredictoLecturaPublica · lo que sí está roto (REQ-1016)', () => {
  it('[TEST-908-11] FALLA si la petición no llegó', () => {
    // Arrange — timeout, DNS caído, la URL mal pegada.
    const publicados: Respuesta = { ok: false, error: 'tiempo agotado' };

    // Act
    const v = veredictoLecturaPublica(publicados, resp(200, [])) as Veredicto;

    // Assert
    expect(v.estado).toBe('FALLA');
    expect(v.detalle).toContain('tiempo agotado');
  });

  it('[TEST-908-12] FALLA si PostgREST responde un estado que no es 200', () => {
    // Arrange — 404 PGRST205 es exactamente el caso de la base sin esquema:
    // eso SÍ es un despliegue roto y tiene que salir en rojo.
    const publicados = resp(404, { code: 'PGRST205' });

    // Act
    const v = veredictoLecturaPublica(publicados, resp(404, {})) as Veredicto;

    // Assert
    expect(v.estado).toBe('FALLA');
    expect(v.detalle).toContain('404');
  });
});

describe('SPEC-908 · veredictoLecturaPublica · vacío no es fallo (REQ-1016)', () => {
  it('[TEST-908-13] AVISO —no FALLA— cuando la tabla está vacía para anon', () => {
    // Arrange — el estado real del despliegue el 2026-09-01: esquema y GRANT
    // cargados, cero filas.
    const publicados = resp(200, []);
    const total = resp(200, []);

    // Act
    const v = veredictoLecturaPublica(publicados, total) as Veredicto;

    // Assert
    expect(v.estado).toBe('AVISO');
  });

  it('[TEST-908-14] y no culpa a las policies: nombra la falta de datos', () => {
    // Arrange
    const v = veredictoLecturaPublica(resp(200, []), resp(200, [])) as Veredicto;

    // Assert — el detalle es lo que alguien lee a las 2 de la mañana. Si dice
    // "RLS demasiado estricto", va a aflojar RLS.
    expect(v.detalle).toMatch(/sin datos|vacía|seed/i);
    expect(v.detalle).not.toMatch(/estricto/i);
  });

  it('[TEST-908-15] AVISO si anon lee filas pero ninguna está publicada', () => {
    // Arrange — hay productos, pero todos en borrador. Legítimo: no prueba nada
    // sobre las policies en ninguna dirección.
    const publicados = resp(200, []);
    const total = resp(200, [{ id: 7 }, { id: 8 }]);

    // Act
    const v = veredictoLecturaPublica(publicados, total) as Veredicto;

    // Assert
    expect(v.estado).toBe('AVISO');
    expect(v.detalle).not.toMatch(/estricto/i);
  });
});

describe('SPEC-908 · veredictoLecturaPublica · el camino feliz', () => {
  it('[TEST-908-16] PASA cuando anon lee productos publicados', () => {
    // Act
    const v = veredictoLecturaPublica(resp(200, [fila]), resp(200, [fila])) as Veredicto;

    // Assert
    expect(v.estado).toBe('PASA');
  });
});

describe('SPEC-908 · avisoNoConcluyente · decirlo (REQ-1017)', () => {
  it('[TEST-908-17] no advierte nada si la lectura pública pasó', () => {
    // Arrange — con filas visibles, el vacío de las sondas de protección sí
    // significa algo: `protegida()` depende de esa premisa.
    const resultados = [{ id: 'TEST-P01', estado: 'PASA' }];

    // Act / Assert
    expect(avisoNoConcluyente(resultados)).toBeNull();
  });

  it('[TEST-908-18] advierte cuando la lectura pública no obtuvo filas', () => {
    // Arrange — sin esa ancla, "200 con lista vacía" es indistinguible de una
    // tabla sin filas, así que los AVISO de protección no prueban nada.
    const resultados = [{ id: 'TEST-P01', estado: 'AVISO' }];

    // Act
    const advertencia = avisoNoConcluyente(resultados);

    // Assert
    expect(advertencia).toBeTruthy();
    expect(advertencia).toMatch(/no son concluyentes|no concluyente/i);
  });
});

/**
 * SPEC-900 · el extractor de requisitos del Gate 4.
 *
 * `requisitosDe` usaba `/REQ-\d{3}/`, exactamente tres dígitos. Con SPEC-908 el
 * proyecto pasó de los 999 requisitos y empezó a numerar en el rango 1000: el
 * regex truncaba `REQ-1001` a `REQ-100` y el gate reclamaba tests para un
 * requisito **que no existe en ninguna spec**.
 *
 * Es peor que un hueco no detectado. Un hueco falso con un ID inventado no se
 * puede cerrar de ninguna forma: no hay nada que citar en un test, así que el
 * gate queda en rojo permanente y se termina desactivando.
 */
describe('SPEC-900 · requisitosDe · numeración de cuatro dígitos', () => {
  it('[TEST-908-19] extrae REQ-1001 entero y no lo trunca a REQ-100', () => {
    // Arrange — la línea tal cual aparece en SPEC-908.
    const texto = '### [REQ-1001] — Ubicuo · una sola fuente de verdad';

    // Act
    const reqs = requisitosDe(texto) as string[];

    // Assert
    expect(reqs).toContain('REQ-1001');
    expect(reqs).not.toContain('REQ-100');
  });

  it('[TEST-908-20] sigue extrayendo los de tres dígitos', () => {
    // Arrange — no se puede arreglar el rango nuevo rompiendo el viejo: todas
    // las specs del proyecto numeran en tres dígitos.
    const texto = '### [REQ-997] y también [REQ-001]';

    // Act
    const reqs = requisitosDe(texto) as string[];

    // Assert
    expect(reqs).toEqual(['REQ-001', 'REQ-997']);
  });
});
