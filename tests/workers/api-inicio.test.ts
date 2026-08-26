import { describe, expect, it } from 'vitest';
import { PUT } from '../../src/pages/api/inicio/index';

/**
 * Capa 3 · SPEC-904 — `PUT /api/inicio`, dentro de workerd.
 *
 * **Alcance deliberadamente corto.** Lo que se ejercita acá es el camino de
 * rechazo: un cuerpo inválido tiene que morir en la validación **sin llegar a
 * la base**. Eso se puede probar de verdad, porque en ese camino el cliente de
 * Supabase no se usa nunca — no hace falta doblarlo, y la Constitución 5.1
 * prohíbe hacerlo.
 *
 * El camino feliz NO se prueba aquí y no es un olvido: escribir de verdad
 * exige un Postgres, y montarlo dentro de workerd significaría un doble de
 * `@supabase/supabase-js`, es decir, un test que verifica el doble. Ese hueco
 * lo cubren `BZ-70` (pgTAP, contra un Postgres real) y `BZ-74` (E2E, contra el
 * panel real). La decisión de qué se escribe está en `planificarInicio`, que
 * es pura y sí está probada entera.
 *
 * `locals` va vacío a propósito: si algún día alguien mueve la validación
 * detrás de la primera consulta, estos tests explotan con un `undefined` en vez
 * de pasar en verde. Ése es justamente el aviso que se quiere.
 */

function peticion(cuerpo: unknown) {
  const request = new Request('https://barzol.test/api/inicio', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });

  return PUT({ request, locals: {} } as never);
}

async function sobre(respuesta: Response) {
  return (await respuesta.json()) as { success: boolean; data: unknown; message: string | null };
}

describe('SPEC-904 · PUT /api/inicio · rechaza antes de tocar la base (REQ-977)', () => {
  it('[TEST-508] un cuerpo sin `items` responde 400', async () => {
    // Act
    const respuesta = await peticion({ heroImages: [] });

    // Assert
    expect(respuesta.status).toBe(400);
    expect((await sobre(respuesta)).success).toBe(false);
  });

  it('[TEST-508] una sección con el título vacío responde 400 (REQ-978)', async () => {
    // Arrange
    const cuerpo = {
      heroImages: [],
      items: [{ id: null, tipo: 'seccion', titulo: '   ', visible: true, productoIds: [] }],
    };

    // Act
    const respuesta = await peticion(cuerpo);

    // Assert
    expect(respuesta.status).toBe(400);
  });

  it('[TEST-508] una data: URI responde 400 (REQ-975)', async () => {
    // Arrange
    const cuerpo = {
      heroImages: ['data:image/png;base64,iVBORw0KGgo='],
      items: [],
    };

    // Act
    const respuesta = await peticion(cuerpo);

    // Assert
    expect(respuesta.status).toBe(400);
  });

  it('[TEST-508] un cuerpo que no es JSON no revienta el worker', async () => {
    // Arrange
    const request = new Request('https://barzol.test/api/inicio', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: 'esto no es json',
    });

    // Act
    const respuesta = await PUT({ request, locals: {} } as never);

    // Assert — un 500 con sobre es aceptable; un throw sin capturar no.
    expect([400, 500]).toContain(respuesta.status);
    expect((await sobre(respuesta)).success).toBe(false);
  });

  it('[TEST-508] el mensaje de error no filtra el nombre de ninguna tabla', async () => {
    // Regla 4.3, el motivo de `BZ-14`: los errores de validación los ve quien
    // manda la petición, y no tienen por qué describir el esquema.
    // Act
    const respuesta = await peticion({ heroImages: [], items: [{ tipo: 'ninguno' }] });

    // Assert
    const { message } = await sobre(respuesta);
    expect(message ?? '').not.toMatch(/home_item|home_section_product|home_hero_image/);
  });
});
