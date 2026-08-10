/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    // Cliente de Supabase ya autenticado, armado una sola vez por el
    // middleware (que ya validó la sesión con auth.getUser()). Los endpoints
    // de escritura lo reusan en vez de crear uno nuevo y re-autenticar —
    // evita un round-trip completo a Supabase Auth por request.
    supabase?: import('@supabase/supabase-js').SupabaseClient;
  }
}
