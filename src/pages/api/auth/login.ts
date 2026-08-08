import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { createSupabaseServerClient, usernameToSyntheticEmail } from '@shared/lib/auth/authClient';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return errorResponse('Usuario y contraseña son obligatorios.', 400);
    }

    const supabase = createSupabaseServerClient(request, cookies);
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToSyntheticEmail(String(username)),
      password: String(password),
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
