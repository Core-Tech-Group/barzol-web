import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '@shared/api/apiResponse';
import { createSupabaseServerClient } from '@shared/lib/auth/authClient';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = await createSupabaseServerClient(request, cookies);
    await supabase.auth.signOut();
    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse((error as Error).message);
  }
};
