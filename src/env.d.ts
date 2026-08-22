/// <reference types="astro/client" />

// Bandera que los paneles del admin levantan mientras hay cambios sin guardar,
// para que `AdminLayout.astro` pueda avisar antes de abandonar la página.
//
// La declaración vivía SOLO dentro del <script> de AdminLayout.astro, así que
// los componentes React que la escriben (`CategoriesAdmin`, `InicioAdmin`,
// `ProductsAdmin`, `GalleryAdmin`) la usaban sin tipo. `astro check` no lo
// detectaba y `tsc --noEmit` sí: son seis errores que aparecieron al montar el
// gate de tipos (BZ-57). Subirla acá la hace visible en todo el proyecto.
// Este archivo es un script global (no tiene import/export de nivel superior),
// así que la interfaz se declara directa: `declare global` solo vale dentro de
// un módulo.
interface Window {
  __adminHasUnsavedChanges?: boolean;
}

declare namespace App {
  interface Locals {
    // Cliente de Supabase ya autenticado, armado una sola vez por el
    // middleware (que ya validó la sesión con auth.getUser()). Los endpoints
    // de escritura lo reusan en vez de crear uno nuevo y re-autenticar —
    // evita un round-trip completo a Supabase Auth por request.
    supabase?: import('@supabase/supabase-js').SupabaseClient;
  }
}
