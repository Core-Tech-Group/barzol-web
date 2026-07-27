import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { getProductos, createProducto } from '@shared/lib/productos/productoService';

export const GET: APIRoute = async () => {
  try {
    const productos = await getProductos();
    return jsonResponse(productos);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const producto = await createProducto(body);
    return jsonResponse(producto, 201);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
