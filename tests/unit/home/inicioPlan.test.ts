import { describe, expect, it } from 'vitest';
import { planificarInicio } from '../../../src/shared/lib/home/inicioPlan';
import type { InicioWriteInput } from '../../../src/shared/lib/home/inicioPlan';

/**
 * Capa 1 · SPEC-904 — el diff de la página de inicio.
 *
 * Toda la decisión de "qué se actualiza, qué se inserta y qué se borra" vive
 * aquí, en una función pura, precisamente para poder probarla sin una base de
 * datos y sin doblar `@supabase/supabase-js` (Constitución 5.1). Lo que queda
 * en el servicio es la ejecución del plan, que no decide nada.
 *
 * El requisito que estos tests protegen es REQ-972 revisado: **nunca puede
 * existir un instante con la portada vacía**. La implementación evidente
 * —borrar todo e insertar todo— cabe en dos líneas y deja el inicio en blanco
 * si el segundo paso falla.
 */

const vacio = { itemsExistentes: [] as string[], heroExistentes: [] as { id: string; orden: number }[] };

function entrada(parcial: Partial<InicioWriteInput> = {}): InicioWriteInput {
  return { heroImages: [], items: [], ...parcial };
}

const seccion = (id: string | null, titulo: string, productoIds: string[] = []) =>
  ({ id, tipo: 'seccion' as const, titulo, visible: true, productoIds });

const banner = (id: string | null, link = '', imagenUrl: string | null = null) =>
  ({ id, tipo: 'banner' as const, visible: true, link, imagenUrl });

describe('SPEC-904 · planificarInicio · qué se escribe y qué se borra', () => {
  it('[TEST-509] un item con id se actualiza; uno con id null se inserta (REQ-972)', () => {
    // Arrange — "10" ya está en la base, la sección nueva todavía no.
    const existente = { itemsExistentes: ['10'], heroExistentes: [] };
    const cuerpo = entrada({ items: [seccion('10', 'Soportes'), seccion(null, 'Sordinas')] });

    // Act
    const plan = planificarInicio(existente, cuerpo);

    // Assert
    expect(plan.actualizarItems.map((a) => a.id)).toEqual(['10']);
    expect(plan.insertarItems).toHaveLength(1);
    expect(plan.insertarItems[0].fila.title).toBe('Sordinas');
    expect(plan.borrarItems).toEqual([]);
  });

  it('[TEST-509] un id que ya no llega se borra', () => {
    // Arrange
    const existente = { itemsExistentes: ['10', '11'], heroExistentes: [] };
    const cuerpo = entrada({ items: [seccion('10', 'Soportes')] });

    // Act
    const plan = planificarInicio(existente, cuerpo);

    // Assert
    expect(plan.borrarItems).toEqual(['11']);
  });

  it('[TEST-509] un id que la isla envía pero la base no tiene se trata como alta', () => {
    // Un id fantasma no puede provocar un `update` a ninguna parte: PostgREST
    // lo aceptaría afectando cero filas y el item desaparecería sin decir nada.
    // Arrange
    const cuerpo = entrada({ items: [seccion('999', 'Fantasma')] });

    // Act
    const plan = planificarInicio(vacio, cuerpo);

    // Assert
    expect(plan.actualizarItems).toEqual([]);
    expect(plan.insertarItems).toHaveLength(1);
  });

  it('[TEST-506] el plan nunca borra todo lo que hay si la entrada trae items (REQ-972)', () => {
    // Arrange — se reemplaza el contenido entero: distintos ids, misma cantidad.
    const existente = { itemsExistentes: ['10', '11'], heroExistentes: [] };
    const cuerpo = entrada({ items: [seccion(null, 'Nueva A'), seccion(null, 'Nueva B')] });

    // Act
    const plan = planificarInicio(existente, cuerpo);

    // Assert — hay altas que ejecutar antes de cualquier borrado.
    expect(plan.insertarItems.length).toBeGreaterThan(0);
    expect(plan.borrarItems).toEqual(['10', '11']);
  });

  it('[TEST-506] vaciar el inicio a propósito sí borra: es una orden explícita', () => {
    // Arrange
    const existente = { itemsExistentes: ['10'], heroExistentes: [] };

    // Act
    const plan = planificarInicio(existente, entrada());

    // Assert
    expect(plan.borrarItems).toEqual(['10']);
    expect(plan.insertarItems).toEqual([]);
  });
});

describe('SPEC-904 · planificarInicio · orden y forma de fila', () => {
  it('[TEST-505] el índice del array es el sort_order, en altas y en cambios', () => {
    // Arrange
    const existente = { itemsExistentes: ['10'], heroExistentes: [] };
    const cuerpo = entrada({ items: [banner(null), seccion('10', 'Segunda'), banner(null)] });

    // Act
    const plan = planificarInicio(existente, cuerpo);

    // Assert
    expect(plan.actualizarItems[0].fila.sort_order).toBe(1);
    expect(plan.insertarItems.map((i) => i.fila.sort_order)).toEqual([0, 2]);
  });

  it('[TEST-505] traduce el vocabulario del dominio al de la columna', () => {
    // `tipo` es 'seccion'/'banner' en el dominio y 'section'/'banner' en la
    // columna `type`. La traducción vive en un solo sitio (homeMapper la hace
    // en el sentido contrario); duplicarla en la isla sería la Regla 9.2.
    // Act
    const plan = planificarInicio(vacio, entrada({ items: [seccion(null, 'Uno'), banner(null)] }));

    // Assert
    expect(plan.insertarItems.map((i) => i.fila.type)).toEqual(['section', 'banner']);
  });

  it('[TEST-505] una sección no escribe link ni imagen; un banner no escribe título', () => {
    // Act
    const plan = planificarInicio(
      vacio,
      entrada({ items: [seccion(null, 'Uno'), banner(null, 'https://x.test', 'https://r2.test/a.webp')] })
    );

    // Assert
    const [sec, ban] = plan.insertarItems;
    expect(sec.fila).toMatchObject({ title: 'Uno', link: null, image_url: null });
    expect(ban.fila).toMatchObject({ title: null, link: 'https://x.test', image_url: 'https://r2.test/a.webp' });
  });

  it('[TEST-503] solo las secciones arrastran productos; los banners no (REQ-974)', () => {
    // `null` y `[]` significan cosas distintas para el ejecutor: `null` es "esta
    // fila no tiene hijos que tocar", `[]` es "borrale todos los que tenga".
    // Act
    const plan = planificarInicio(vacio, entrada({ items: [seccion(null, 'Uno', ['7', '3']), banner(null)] }));

    // Assert
    expect(plan.insertarItems[0].productoIds).toEqual(['7', '3']);
    expect(plan.insertarItems[1].productoIds).toBeNull();
  });

  it('[TEST-503] el orden de los productos dentro de la sección se conserva', () => {
    // Act
    const plan = planificarInicio(vacio, entrada({ items: [seccion(null, 'Uno', ['9', '1', '5'])] }));

    // Assert — sin ordenar, sin deduplicar: es el orden que eligió el admin.
    expect(plan.insertarItems[0].productoIds).toEqual(['9', '1', '5']);
  });
});

describe('SPEC-904 · planificarInicio · imágenes hero', () => {
  // `home_hero_image.image_url` es NOT NULL (schema.sql:205). Una portada vacía
  // es, por tanto, una fila **ausente**: no existe la fila con `null`. Y como
  // los huecos pueden estar en el medio, el emparejamiento va por `sort_order`
  // y no por posición en el array.
  const hero = (id: string, orden: number) => ({ id, orden });

  it('[TEST-505] actualiza la fila hero que ya ocupa ese orden', () => {
    // Arrange
    const existente = { itemsExistentes: [], heroExistentes: [hero('h1', 0), hero('h2', 1)] };
    const cuerpo = entrada({ heroImages: ['https://r2.test/a.webp', 'https://r2.test/b.webp'] });

    // Act
    const plan = planificarInicio(existente, cuerpo);

    // Assert
    expect(plan.actualizarHero).toEqual([
      { id: 'h1', image_url: 'https://r2.test/a.webp', sort_order: 0 },
      { id: 'h2', image_url: 'https://r2.test/b.webp', sort_order: 1 },
    ]);
    expect(plan.insertarHero).toEqual([]);
    expect(plan.borrarHero).toEqual([]);
  });

  it('[TEST-505] quitar una portada borra su fila, no la deja en null', () => {
    // Arrange
    const existente = { itemsExistentes: [], heroExistentes: [hero('h1', 0), hero('h2', 1)] };

    // Act
    const plan = planificarInicio(existente, entrada({ heroImages: ['https://r2.test/a.webp', null] }));

    // Assert — un `update` a null violaría el NOT NULL y el guardado entero
    // fallaría con un error de Postgres que nadie sabría interpretar.
    expect(plan.borrarHero).toEqual(['h2']);
    expect(plan.actualizarHero).toHaveLength(1);
  });

  it('[TEST-505] inserta en el orden correcto aunque haya un hueco delante', () => {
    // Arrange — la portada 1 está vacía y la 2 tiene imagen.
    const existente = { itemsExistentes: [], heroExistentes: [] };

    // Act
    const plan = planificarInicio(existente, entrada({ heroImages: [null, 'https://r2.test/b.webp'] }));

    // Assert — sort_order 1, no 0: el hueco no compacta las posiciones.
    expect(plan.insertarHero).toEqual([{ image_url: 'https://r2.test/b.webp', sort_order: 1 }]);
  });

  it('[TEST-505] vaciar todas las portadas borra todas las filas', () => {
    // Arrange
    const existente = { itemsExistentes: [], heroExistentes: [hero('h1', 0), hero('h2', 1), hero('h3', 2)] };

    // Act
    const plan = planificarInicio(existente, entrada({ heroImages: [null, null, null] }));

    // Assert
    expect(plan.borrarHero).toEqual(['h1', 'h2', 'h3']);
    expect(plan.insertarHero).toEqual([]);
    expect(plan.actualizarHero).toEqual([]);
  });
});

describe('SPEC-904 · INV-2 · nada con forma de data: llega al plan', () => {
  it('[TEST-504] una data: URI en un banner no se planifica', () => {
    // La validación de REQ-975 vive en el esquema Zod, pero el plan es la
    // última frontera antes de la columna: si algo se cuela, se corta acá.
    // Act
    const planificar = () =>
      planificarInicio(vacio, entrada({ items: [banner(null, '', 'data:image/png;base64,iVBORw0KGgo=')] }));

    // Assert
    expect(planificar).toThrow(/data:/i);
  });

  it('[TEST-504] una data: URI en una imagen hero tampoco', () => {
    // Act
    const planificar = () =>
      planificarInicio(vacio, entrada({ heroImages: ['data:image/png;base64,iVBORw0KGgo='] }));

    // Assert
    expect(planificar).toThrow(/data:/i);
  });
});
