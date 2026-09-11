import { describe, expect, it, vi } from 'vitest';
import {
  fotosIncompletas,
  planificarGaleria,
  guardarGaleria,
  subirPendientes,
} from '../../../src/admin/shared/guardarGaleria';
import type { FotoIsla } from '../../../src/admin/shared/guardarGaleria';

/**
 * SPEC-905 REQ-984, REQ-985, REQ-986 — el guardado de la galería, fuera de la
 * isla.
 *
 * `GalleryAdmin.tsx` está a 29 líneas del límite de la Regla 9.1 y **no** tiene
 * trinquete que lo cubra: si esta SPEC lo empuja por encima de 500, el gate
 * bloquea. Sacar el plan y su ejecución no es una preferencia de diseño, es la
 * restricción con la que se escribió la tarea — y de paso deja probable lo que
 * antes era un bucle dentro de un componente React.
 */

const URL_A = 'https://media.barzol.test/galeria/2026/08/a.webp';
const URL_B = 'https://media.barzol.test/galeria/2026/08/b.webp';

const foto = (id: string, caption: string, image: string | null = URL_A): FotoIsla =>
  ({ id, caption, image });

const ok = () =>
  vi.fn(async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ success: true, data: null, message: null }), { status: 200 })
  );

describe('SPEC-905 · planificarGaleria · qué se escribe (REQ-985)', () => {
  it('[TEST-523] un id provisional se crea; uno existente se actualiza', () => {
    // Arrange
    const iniciales = [foto('1', 'Vieja')];
    const actuales = [foto('1', 'Vieja editada'), foto('new-1756-1', 'Nueva', URL_B)];

    // Act
    const plan = planificarGaleria(iniciales, actuales);

    // Assert
    expect(plan.actualizar).toEqual([{ id: '1', titulo: 'Vieja editada', imagenUrl: URL_A, orden: 0 }]);
    expect(plan.crear).toEqual([{ titulo: 'Nueva', imagenUrl: URL_B, orden: 1 }]);
    expect(plan.borrar).toEqual([]);
  });

  it('[TEST-523] lo que estaba y ya no llega se borra', () => {
    // Arrange
    const iniciales = [foto('1', 'Uno'), foto('2', 'Dos')];

    // Act
    const plan = planificarGaleria(iniciales, [foto('2', 'Dos')]);

    // Assert
    expect(plan.borrar).toEqual(['1']);
  });

  it('[TEST-523] el índice del array es el orden', () => {
    // El orden lo fija arrastrar tarjetas, y es una propiedad del conjunto: no
    // hay campo que pueda contradecir a la posición.
    // Act
    const plan = planificarGaleria([], [foto('new-1', 'A'), foto('new-2', 'B'), foto('new-3', 'C')]);

    // Assert
    expect(plan.crear.map((c) => c.orden)).toEqual([0, 1, 2]);
  });

  it('[TEST-523] recorta los títulos', () => {
    // Act
    const plan = planificarGaleria([], [foto('new-1', '  Sordina con logo  ')]);

    // Assert
    expect(plan.crear[0].titulo).toBe('Sordina con logo');
  });

  it('[TEST-527] una foto sin URL válida no llega al plan (REQ-980)', () => {
    // Es el bug de BZ-82 al revés: antes el nombre del archivo viajaba hasta la
    // columna. Ahora ni siquiera entra en el plan.
    // Act
    const planificar = () => planificarGaleria([], [foto('new-1', 'Rota', 'firefox_ix0xISR5X0.png')]);

    // Assert
    expect(planificar).toThrow(/imagen/i);
  });
});

describe('SPEC-905 · planificarGaleria · solo viaja lo que cambió (REQ-988)', () => {
  it('[TEST-531] una foto existente sin cambios no se envía', () => {
    // Arrange
    const iniciales = [foto('1', 'Uno'), foto('2', 'Dos')];

    // Act
    const plan = planificarGaleria(iniciales, [foto('1', 'Uno'), foto('2', 'Dos editada')]);

    // Assert
    expect(plan.actualizar.map((a) => a.id)).toEqual(['2']);
  });

  it('[TEST-531] sin ningún cambio, el plan queda vacío', () => {
    // Arrange
    const iniciales = [foto('1', 'Uno'), foto('2', 'Dos')];

    // Act
    const plan = planificarGaleria(iniciales, [foto('1', 'Uno'), foto('2', 'Dos')]);

    // Assert
    expect(plan).toEqual({ crear: [], actualizar: [], borrar: [] });
  });

  it('[TEST-531] espacios de más en el título no cuentan como cambio', () => {
    // Act
    const plan = planificarGaleria([foto('1', 'Uno')], [foto('1', '  Uno  ')]);

    // Assert
    expect(plan.actualizar).toEqual([]);
  });

  it('[TEST-531] cambiar solo la imagen sí cuenta', () => {
    // Act
    const plan = planificarGaleria([foto('1', 'Uno', URL_A)], [foto('1', 'Uno', URL_B)]);

    // Assert
    expect(plan.actualizar).toEqual([{ id: '1', titulo: 'Uno', imagenUrl: URL_B, orden: 0 }]);
  });

  it('[TEST-531] al intercambiar dos fotos se envían esas dos, no las demás', () => {
    // Arrange
    const iniciales = [foto('1', 'A'), foto('2', 'B'), foto('3', 'C')];

    // Act
    const plan = planificarGaleria(iniciales, [foto('2', 'B'), foto('1', 'A'), foto('3', 'C')]);

    // Assert
    expect(plan.actualizar.map((a) => [a.id, a.orden])).toEqual([
      ['2', 0],
      ['1', 1],
    ]);
  });
});

describe('SPEC-905 · subirPendientes · la imagen sube al guardar (REQ-980 enmendado)', () => {
  it('[TEST-530] sube solo las fotos con archivo pendiente y devuelve su URL por id', async () => {
    // Arrange
    const blob = new Blob(['x'], { type: 'image/webp' });
    const subir = vi.fn(async (_b: Blob, titulo: string) => `https://media.barzol.test/galeria/${titulo}.webp`);

    // Act
    const urls = await subirPendientes([foto('1', 'Con logo', null), foto('2', 'Sin cambios')], { '1': blob }, subir);

    // Assert
    expect(subir).toHaveBeenCalledTimes(1);
    expect(urls).toEqual({ '1': 'https://media.barzol.test/galeria/Con logo.webp' });
  });

  it('[TEST-530] el archivo se nombra con el título recortado', async () => {
    // Arrange
    const subir = vi.fn(async () => URL_A);

    // Act
    await subirPendientes([foto('new-1', '  Sordina grabada  ', null)], { 'new-1': new Blob(['x']) }, subir);

    // Assert
    expect(subir).toHaveBeenCalledWith(expect.any(Blob), 'Sordina grabada');
  });

  it('[TEST-530] sin pendientes no sube nada', async () => {
    // Arrange
    const subir = vi.fn(async () => URL_A);

    // Act
    const urls = await subirPendientes([foto('1', 'Uno')], {}, subir);

    // Assert
    expect(subir).not.toHaveBeenCalled();
    expect(urls).toEqual({});
  });
});

describe('SPEC-905 · guardarGaleria · el orden de las peticiones (REQ-985)', () => {
  it('[TEST-524] los borrados van después de las escrituras', async () => {
    // Arrange
    const enviar = ok();
    const plan = {
      crear: [{ titulo: 'Nueva', imagenUrl: URL_B, orden: 1 }],
      actualizar: [{ id: '1', titulo: 'Vieja', imagenUrl: URL_A, orden: 0 }],
      borrar: ['9'],
    };

    // Act
    await guardarGaleria('accesorios', plan, enviar);

    // Assert — sin transacción que envolver, el orden es lo único que impide
    // que un fallo a media escritura deje la galería vacía.
    const metodos = enviar.mock.calls.map((c) => (c[1] as RequestInit).method);
    expect(metodos).toEqual(['PUT', 'POST', 'DELETE']);
  });

  it('[TEST-524] cada operación va a su ruta', async () => {
    // Arrange
    const enviar = ok();
    const plan = {
      crear: [{ titulo: 'Nueva', imagenUrl: URL_B, orden: 0 }],
      actualizar: [],
      borrar: ['9'],
    };

    // Act
    await guardarGaleria('trabajos', plan, enviar);

    // Assert
    const rutas = enviar.mock.calls.map((c) => c[0]);
    expect(rutas).toEqual(['/api/galeria', '/api/galeria/9']);
  });

  it('[TEST-524] el `tipo` viaja en cada escritura', async () => {
    // Arrange — las dos galerías comparten tabla y se distinguen por `type`.
    const enviar = ok();

    // Act
    await guardarGaleria('trabajos', { crear: [{ titulo: 'A', imagenUrl: URL_A, orden: 0 }], actualizar: [], borrar: [] }, enviar);

    // Assert
    const cuerpo = JSON.parse((enviar.mock.calls[0][1] as RequestInit).body as string);
    expect(cuerpo.tipo).toBe('trabajos');
  });

  it('[TEST-525] un error del servidor se propaga con su mensaje (REQ-986)', async () => {
    // Arrange
    const enviar = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ success: false, data: null, message: 'new row violates row-level security policy' }), { status: 403 })
    );

    // Act + Assert
    await expect(
      guardarGaleria('accesorios', { crear: [{ titulo: 'A', imagenUrl: URL_A, orden: 0 }], actualizar: [], borrar: [] }, enviar)
    ).rejects.toThrow(/row-level security/);
  });

  it('[TEST-525] un 200 con success:false también es un fallo', async () => {
    // Arrange
    const enviar = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ success: false, data: null, message: 'no se pudo' }), { status: 200 })
    );

    // Act + Assert
    await expect(
      guardarGaleria('accesorios', { crear: [], actualizar: [], borrar: ['1'] }, enviar)
    ).rejects.toThrow(/no se pudo/);
  });

  it('[TEST-525] si falla una escritura, no se ejecuta ningún borrado', async () => {
    // Arrange — el fallo interrumpe antes de la parte destructiva.
    const enviar = vi.fn(async (_url: string, _init: RequestInit) =>
      new Response(JSON.stringify({ success: false, data: null, message: 'error' }), { status: 500 })
    );
    const plan = { crear: [], actualizar: [{ id: '1', titulo: 'A', imagenUrl: URL_A, orden: 0 }], borrar: ['9'] };

    // Act
    await expect(guardarGaleria('accesorios', plan, enviar)).rejects.toThrow();

    // Assert
    expect(enviar.mock.calls.map((c) => (c[1] as RequestInit).method)).toEqual(['PUT']);
  });
});

describe('SPEC-905 · fotosIncompletas · lo que el panel bloquea (REQ-984)', () => {
  it('[TEST-526] una imagen inválida cuenta como falta de foto', () => {
    // Éste es el caso de las seis filas de producción. Sin este bloqueo, tocar
    // un título dispararía un 400 del servidor y nadie sabría por qué.
    // Arrange
    const fotos = [foto('1', 'Soporte grabado con nombre', 'firefox_ix0xISR5X0.png')];

    // Act
    const { sinImagen, sinTitulo } = fotosIncompletas(fotos);

    // Assert
    expect(sinImagen).toEqual(['1']);
    expect(sinTitulo).toEqual([]);
  });

  it('[TEST-526] una imagen ausente también', () => {
    // Act
    const { sinImagen } = fotosIncompletas([foto('new-1', 'Sin foto', null)]);

    // Assert
    expect(sinImagen).toEqual(['new-1']);
  });

  it('[TEST-526] un título en blanco se reporta aparte', () => {
    // Act
    const { sinImagen, sinTitulo } = fotosIncompletas([foto('1', '   ')]);

    // Assert
    expect(sinTitulo).toEqual(['1']);
    expect(sinImagen).toEqual([]);
  });

  it('[TEST-526] una tarjeta completa no aparece en ninguna lista', () => {
    // Act
    const { sinImagen, sinTitulo } = fotosIncompletas([foto('1', 'Sordina con logo de banda')]);

    // Assert
    expect(sinImagen).toEqual([]);
    expect(sinTitulo).toEqual([]);
  });
});
