import { z } from 'zod';
import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { createSupabaseServerClient, usernameToSyntheticEmail } from '@shared/lib/auth/authClient';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'obligatorio'),
  password: z.string().min(1, 'obligatorio'),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const validacion = loginSchema.safeParse(await request.json());
    if (!validacion.success) {
      return errorResponse('Usuario y contraseña son obligatorios.', 400);
    }
    const { username, password } = validacion.data;

    const supabase = await createSupabaseServerClient(request, cookies);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToSyntheticEmail(username),
      password,
    });

    if (error) {
      console.error('[login] Supabase error:', error.message, error.status);
      return errorResponse('Usuario o contraseña incorrectos.', 401);
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
