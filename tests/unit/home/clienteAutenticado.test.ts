import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * SPEC-904 REQ-976 e INV-4 — el endpoint escribe con el cliente de la sesión.
 *
 * Éste es un test sobre el **código fuente**, no sobre su comportamiento, y esa
 * rareza está justificada: la diferencia entre `locals.supabase` y el singleton
 * anónimo no se puede observar sin un Postgres con RLS. Con el cliente
 * equivocado el código compila, los tipos pasan, la petición sale — y la base
 * la rechaza con `auth.uid()` nulo, en producción, cuando alguien pulsa
 * Guardar.
 *
 * Es exactamente la clase de fallo que `BZ-80` documenta en la otra dirección:
 * `productoService` usa el singleton anónimo y por eso el panel ve borradores.
 * Aquí se fija el invariante antes de que la costumbre se repita.
 */

const ENDPOINT = 'src/pages/api/inicio/index.ts';
const fuente = readFileSync(ENDPOINT, 'utf8');

describe('SPEC-904 · PUT /api/inicio · con qué cliente escribe (REQ-976)', () => {
  it('[TEST-508] no importa el singleton anónimo (INV-4)', () => {
    // Assert — `getSupabase()` cachea un cliente con la anon key a nivel de
    // módulo. Para leer el catálogo público está bien; para escribir es lo que
    // hace que las policies rechacen la operación.
    expect(fuente).not.toMatch(/getSupabase/);
    expect(fuente).not.toMatch(/from\s+'@shared\/lib\/db\/client'/);
  });

  it('[TEST-508] escribe con el cliente que dejó el middleware en locals', () => {
    // Assert
    expect(fuente).toMatch(/updateInicio\(\s*locals\.supabase/);
  });

  it('[TEST-508] valida antes de tocar `locals`, no después (REQ-977)', () => {
    // El orden es el requisito: un cuerpo inválido no debe llegar a la base.
    // Assert
    // `indexOf('updateInicio')` daría el `import` de la primera línea; lo que
    // interesa es la llamada.
    const posValidacion = fuente.indexOf('safeParse');
    const posEscritura = fuente.indexOf('await updateInicio(');
    expect(posValidacion).toBeGreaterThan(-1);
    expect(posEscritura).toBeGreaterThan(posValidacion);
  });
});

describe('SPEC-904 · REQ-979 · la migración pendiente dice lo que promete', () => {
  const sql = readFileSync('supabase/pendiente-policies-home.sql', 'utf8');

  it.each(['home_item', 'home_hero_image', 'home_section_product'])(
    '[TEST-508] declara la policy "admin write" en %s',
    (tabla) => {
      // Assert
      expect(sql).toMatch(new RegExp(`create policy "admin write" on ${tabla} for all to authenticated`));
    }
  );

  it('[TEST-508] usa el mismo predicado que las seis tablas que ya la tienen', () => {
    // Arrange — si algún día cambia la forma del predicado, tiene que cambiar
    // en las nueve. Este test lo compara contra el esquema en vez de confiar
    // en que quien lo edite se acuerde.
    const esquema = readFileSync('supabase/schema.sql', 'utf8');
    const predicado = 'exists (select 1 from admin_profile where id = auth.uid())';

    // Assert
    expect(esquema).toContain(predicado);
    expect(sql.match(new RegExp(predicado.replace(/[()*]/g, '\\$&'), 'g'))).toHaveLength(6);
  });

  it('[TEST-508] va envuelto en una transacción', () => {
    // Assert — tres policies o ninguna.
    expect(sql).toMatch(/^begin;$/m);
    expect(sql).toMatch(/^commit;$/m);
  });
});
