import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { getGaleria, addGaleriaItem } from '@shared/lib/galeria/galeriaService';

export const GET: APIRoute = async () => {
  try {
    const galeria = await getGaleria();
    return jsonResponse(galeria);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const item = await addGaleriaItem(body);
    return jsonResponse(item, 201);
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
