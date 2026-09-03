import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * SPEC-908 — los invariantes del despliegue, comprobados sobre los archivos
 * versionados del repositorio.
 *
 * **Por qué esto es un test y no una revisión de código.** `BZ-86` fue dos
 * líneas de `wrangler.jsonc` apuntando al proyecto de Supabase anterior mientras
 * el secreto ya era el del nuevo. El build salió verde, los 217 tests pasaron y
 * la web devolvió 500 en todas sus rutas. Ningún test del proyecto miraba la
 * configuración, porque la configuración "no es código" — hasta que tumba el
 * sitio entero, que es lo que hizo.
 *
 * Lo que se fija aquí es barato de comprobar y caro de descubrir en producción:
 * la forma de las URLs (INV-2), que no quede nada apuntando al despliegue
 * anterior (INV-3) y que no viaje ninguna credencial en el repo (INV-5).
 */

const raiz = new URL('../../../', import.meta.url).pathname;
const leer = (ruta: string) => readFileSync(`${raiz}${ruta}`, 'utf8');

const wrangler = leer('wrangler.jsonc');
const urlsDeWrangler = [...wrangler.matchAll(/"(BARZOL_\w*_URL)":\s*"([^"]*)"/g)];

describe('SPEC-908 · INV-2 · la forma de las URLs (REQ-1001)', () => {
  it('[TEST-908-01] `wrangler.jsonc` declara las dos URLs públicas', () => {
    // Arrange / Act
    const nombres = urlsDeWrangler.map(([, nombre]) => nombre);

    // Assert — si una desaparece, el worker arranca y falla en la primera
    // petición con MissingEnvError, no en el build.
    expect(nombres).toContain('BARZOL_SUPABASE_URL');
    expect(nombres).toContain('BARZOL_R2_PUBLIC_URL');
  });

  it.each(['BARZOL_SUPABASE_URL', 'BARZOL_R2_PUBLIC_URL'])(
    '[TEST-908-01] %s es una URL https absoluta y sin ruta',
    (nombre) => {
      // Arrange
      const valor = urlsDeWrangler.find(([, n]) => n === nombre)?.[2] ?? '';

      // Act
      const url = new URL(valor);

      // Assert — `createClient` concatena `/rest/v1/` por su cuenta: una base
      // que ya lleve ruta produce `.../rest/v1/rest/v1/product` y un 404 en
      // cada consulta. El `.env` del traspaso venía exactamente así.
      expect(url.protocol).toBe('https:');
      expect(url.pathname).toBe('/');
      expect(valor).not.toMatch(/\/$/);
    }
  );

  it('[TEST-908-01] ninguna URL trae corchetes, comillas ni espacios', () => {
    // Arrange — copiar desde un documento renderizado deja
    // `[https://...](https://...)` dentro del valor y tumba el sitio entero.
    const valores = urlsDeWrangler.map(([, , v]) => v);

    // Assert
    for (const v of valores) {
      expect(v).not.toMatch(/[[\]"'`\s]/);
    }
  });
});

describe('SPEC-908 · INV-3 · nada apunta al despliegue anterior (REQ-1011)', () => {
  // `docs/1_inbox/**` y los kanban antiguos quedan fuera a propósito: son
  // registro histórico y reescribirlos sería falsificarlo.
  const vigentes = [
    'wrangler.jsonc',
    'scripts/smoke.mjs',
    'scripts/subir-secretos.mjs',
    'README.md',
    'CLAUDE.md',
    '.env.example',
  ];

  it.each(vigentes)('[TEST-908-09] %s no nombra el proyecto ni el host viejos', (ruta) => {
    // Act
    const contenido = leer(ruta);

    // Assert — el runbook de diagnóstico es el que se abre cuando producción ya
    // está rota; que mande a mirar el sitio equivocado justo entonces es la peor
    // hora posible para descubrirlo.
    expect(contenido).not.toContain('willymichael-cardenas');
    expect(contenido).not.toContain('rnfcccnesxunjtpwahce');
    expect(contenido).not.toContain('pub-12c5101b');
  });

  it('[TEST-908-06] el humo apunta por defecto al despliegue vigente (REQ-1008)', () => {
    // Arrange / Act
    const smoke = leer('scripts/smoke.mjs');

    // Assert — un defecto obsoleto no falla: interroga el sitio anterior, que
    // sigue sano, y sale en VERDE sin mirar el que se acaba de publicar.
    expect(smoke).toMatch(/URL_POR_DEFECTO = 'https:\/\/barzol-web\.barzolweb3d\.workers\.dev'/);
  });
});

describe('SPEC-908 · INV-5 · ninguna credencial versionada (REQ-1010)', () => {
  it('[TEST-908-08] `.env.example` no trae claves con valor', () => {
    // Arrange
    const ejemplo = leer('.env.example');

    // Act — las líneas `CLAVE=valor`, ignorando comentarios.
    const conValor = ejemplo
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('#'))
      .filter((l) => /^BARZOL_\w+=.+/.test(l.trim()));

    // Assert — la publishable no es secreta, pero versionarla ata el repo a un
    // proyecto concreto y convierte cada clon en la configuración de otra cuenta.
    expect(conValor).toEqual([]);
  });

  it('[TEST-908-08] ningún archivo vigente contiene una clave de Supabase', () => {
    // Arrange — solo el prefijo con algo detrás; mencionarlo en una explicación
    // (`sb_publishable_...`) es legítimo y no debe disparar el test.
    const sospechosa = /sb_(publishable|secret)_[A-Za-z0-9_-]{10,}/;

    // Assert
    for (const ruta of ['wrangler.jsonc', '.env.example', 'README.md', 'CLAUDE.md']) {
      expect(leer(ruta)).not.toMatch(sospechosa);
    }
  });
});

describe('SPEC-908 · INV-4 · el commit desplegado es un SHA (REQ-1009)', () => {
  it('[TEST-908-07] `astro.config.mjs` valida la forma antes de usar el valor', () => {
    // Arrange / Act
    const config = leer('astro.config.mjs');

    // Assert — el despliegue llegó a informar `commit: "main"`, con lo que
    // TEST-S06 no podía coincidir nunca y la única sonda que detecta un bundle
    // obsoleto quedaba muerta (BZ-52).
    expect(config).toContain('ES_SHA');
    expect(config).toMatch(/\[0-9a-f\]\{7,40\}/);
  });
});
