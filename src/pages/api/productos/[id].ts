import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import {
  getProductoById,
  updateProducto,
  deleteProducto,
} from '@shared/lib/productos/productoService';

export const GET: APIRoute = async ({ params }) => {
  try {
    const producto = await getProductoById(params.id!);
    if (!producto) return errorResponse('Producto no encontrado', 404);
    return jsonResponse(producto);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const body = await request.json();
    const producto = await updateProducto(params.id!, body);
    return jsonResponse(producto);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    await deleteProducto(params.id!);
    return jsonResponse(null);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
