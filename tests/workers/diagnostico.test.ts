import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from 'cloudflare:test';
import { GET as diagnostico } from '../../src/pages/api/diagnostico';
import { GET as salud } from '../../src/pages/api/salud';

/**
 * Capa 3 · SPEC-903 — los tres niveles de acceso al diagnóstico.
 *
 * La regla de acceso ya se prueba como lógica pura en
 * `tests/unit/diagnostico/acceso.test.ts`. Esto NO la repite: comprueba que el
 * endpoint la **usa**. Un handler puede tener la regla perfecta al lado y no
 * llamarla nunca, y eso es exactamente lo que un test de unidad no ve.
 */

const TOKEN = 'token-de-prueba-no-usar-en-produccion';

/** Petición al diagnóstico, con o sin la cabecera del token. */
function peticion(token?: string) {
  const request = new Request('https://barzol.test/api/diagnostico', {
    headers: token ? { 'x-diagnostico-token': token } : {},
  });

  return diagnostico({ request } as never);
}

describe('SPEC-903 · GET /api/salud', () => {
  it('[TEST-W20] responde 200 con ok, commit y momento (REQ-941)', async () => {
    const respuesta = await salud({} as never);

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as Record<string, unknown>;

    expect(cuerpo).toHaveProperty('ok');
    expect(cuerpo).toHaveProperty('commit');
    expect(cuerpo).toHaveProperty('momento');
  });

  it('[TEST-W21] no describe la configuración del worker (REQ-941)', async () => {
    const respuesta = await salud({} as never);
    const cuerpo = (await respuesta.json()) as Record<string, unknown>;

    // Lo que NO debe estar es justo lo que hacía útil al diagnóstico — y por lo
    // mismo, lo que lo hacía un mapa para quien busque por dónde entrar.
    expect(cuerpo).not.toHaveProperty('clavesRecibidas');
    expect(cuerpo).not.toHaveProperty('bindings');
    expect(cuerpo).not.toHaveProperty('variables');
    expect(cuerpo).not.toHaveProperty('supabase');
  });

  it('[TEST-W20b] no cachea: describe el estado de ESTE momento', async () => {
    const respuesta = await salud({} as never);

    expect(respuesta.headers.get('cache-control')).toBe('no-store');
  });
});

describe('SPEC-903 · GET /api/diagnostico · sin token configurado', () => {
  // El entorno de prueba no define BARZOL_DIAGNOSTICO_TOKEN, así que éste es el
  // estado en que quedará producción en cuanto se despliegue y hasta que
  // alguien cargue el secreto.

  it('[TEST-W22] responde 200 en modo reducido, con la pista (REQ-942)', async () => {
    const respuesta = await peticion();

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as { pistas?: string[] };

    expect(cuerpo.pistas?.[0]).toContain('BARZOL_DIAGNOSTICO_TOKEN');
  });

  it('[TEST-W22b] el modo reducido NO filtra la configuración (REQ-942)', async () => {
    const cuerpo = (await (await peticion()).json()) as Record<string, unknown>;

    expect(cuerpo).not.toHaveProperty('clavesRecibidas');
    expect(cuerpo).not.toHaveProperty('bindings');
    expect(cuerpo).not.toHaveProperty('variables');
  });

  it('[TEST-W22c] presentar un token cualquiera no abre el detalle (INV-2)', async () => {
    // Si esto fallara, bastaría con no configurar nada para verlo todo.
    const cuerpo = (await (await peticion('lo-que-sea')).json()) as Record<string, unknown>;

    expect(cuerpo).not.toHaveProperty('clavesRecibidas');
  });

  it('[TEST-W27] el cuerpo reducido comparte forma con /api/salud (INV-4)', async () => {
    const reducido = (await (await peticion()).json()) as Record<string, unknown>;
    const basico = (await (await salud({} as never)).json()) as Record<string, unknown>;

    expect(reducido.commit).toBe(basico.commit);
    expect(typeof reducido.ok).toBe('boolean');
  });

  it('[TEST-W26] ninguna respuesta contiene un token (REQ-947)', async () => {
    const texto = await (await peticion(TOKEN)).text();

    expect(texto).not.toContain(TOKEN);
  });
});

describe('SPEC-903 · GET /api/diagnostico · con token configurado', () => {
  // `env` de `cloudflare:test` es el mismo objeto que lee `readServerEnv` desde
  // `cloudflare:workers`. Mutarlo acá es la única forma de ejercitar los tres
  // niveles en la misma corrida — y estos son los que verifican la protección
  // de verdad, así que dejarlos fuera habría sido probar solo la mitad fácil.
  beforeEach(() => {
    env.BARZOL_DIAGNOSTICO_TOKEN = TOKEN;
  });

  afterEach(() => {
    delete env.BARZOL_DIAGNOSTICO_TOKEN;
  });

  it('[TEST-W23] con la cabecera correcta devuelve el detalle completo (REQ-943)', async () => {
    const respuesta = await peticion(TOKEN);

    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as Record<string, unknown>;

    expect(cuerpo).toHaveProperty('clavesRecibidas');
    expect(cuerpo).toHaveProperty('bindings');
    expect(cuerpo).toHaveProperty('variables');
  });

  it('[TEST-W24] sin cabecera responde 404 vacío, no 403 (REQ-944)', async () => {
    const respuesta = await peticion();

    // 404 y no 403: un 403 confirmaría que la ruta existe.
    expect(respuesta.status).toBe(404);
    expect(await respuesta.text()).toBe('');
  });

  it('[TEST-W25] con cabecera incorrecta responde 404 vacío (REQ-944)', async () => {
    const respuesta = await peticion('token-equivocado');

    expect(respuesta.status).toBe(404);
    expect(await respuesta.text()).toBe('');
  });

  it('[TEST-W25b] un prefijo válido tampoco alcanza (REQ-944, REQ-945)', async () => {
    const respuesta = await peticion(TOKEN.slice(0, 10));

    expect(respuesta.status).toBe(404);
  });

  it('[TEST-W26b] el detalle completo no incluye el token (REQ-947)', async () => {
    const texto = await (await peticion(TOKEN)).text();

    expect(texto).not.toContain(TOKEN);
  });
});
