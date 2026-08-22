import { afterEach, vi } from 'vitest';

/**
 * Setup compartido por los proyectos `unit` y `components`.
 *
 * NOTA SOBRE EL GUARDIA DE DETERMINISMO (Constitución 6.1)
 * --------------------------------------------------------
 * El plan original (`BZ-58`) pedía sobrescribir `Date.now` acá para que tocar
 * el reloj desde lógica pura fallara ruidosamente. No se hace, y el motivo es
 * concreto: Vitest usa `Date.now` internamente —temporizadores, reporteros,
 * medición de duración de cada test—, así que romperlo durante toda la corrida
 * produce fallos en sitios que no tienen nada que ver con el código bajo
 * prueba. El guardia costaría más de lo que atrapa.
 *
 * La regla 6.1 se verifica estáticamente en `scripts/sdd-trace.mjs`, que es
 * además donde debía estar: un grep sobre `src/shared/lib/**` es determinista
 * y no depende de que un test llegue a ejecutarse.
 */
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});
