/** Contrato puro: cada página llega ordenada por id ascendente. */
export interface CalificacionProducto {
  id: number;
  promedio: number;
  cantidad: number;
}

export interface ResumenCalificaciones {
  promedio: number;
  cantidad: number;
}

export type LeerPaginaCalificaciones = (afterId: number, limit: number) => Promise<CalificacionProducto[]>;

export class CalificacionGlobalError extends Error {
  readonly code = 'ORDEN_INVALIDO' as const;

  constructor() {
    super('Las calificaciones deben llegar en orden por id.');
    this.name = 'CalificacionGlobalError';
  }
}

export async function resumirCalificaciones(
  leerPagina: LeerPaginaCalificaciones,
  tamanoPagina = 500
): Promise<ResumenCalificaciones> {
  let ultimoId = 0;
  let cantidad = 0;
  let sumaPonderada = 0;

  while (true) {
    const pagina = await leerPagina(ultimoId, tamanoPagina);
    for (const producto of pagina) {
      if (producto.id <= ultimoId) throw new CalificacionGlobalError();
      ultimoId = producto.id;
      if (producto.cantidad <= 0) continue;
      cantidad += producto.cantidad;
      sumaPonderada += producto.promedio * producto.cantidad;
    }
    if (pagina.length < tamanoPagina) break;
  }

  return {
    promedio: cantidad === 0 ? 0 : Math.round((sumaPonderada / cantidad) * 10) / 10,
    cantidad,
  };
}
