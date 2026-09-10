-- ============================================================================
--  Tercer servicio: galería "Diseño CAD e impresión 3D"
--  2026-09-10
-- ============================================================================
--
--  APLICADO el 2026-09-10 en el proyecto actual `hlyhkoxnadkxbrjtzuzx`
--  (wrangler.jsonc). El responsable confirmó que enum_range devuelve
--  accessories, projects, design.
--
--  Ojo: `rnfcccnesxunjtpwahce` es el Supabase de la cuenta anterior (ver
--  docs/2_backlog/20260831-0620-kanban-despliegue-cuenta-barzol.md), no un
--  entorno de desarrollo. No hace falta aplicarlo ahí.
--
--  Por qué el orden importa
--  ------------------------
--  El código filtra la galería con `.eq('type', 'design')`. Mientras el enum no
--  tenga ese valor, Postgres rechaza la consulta — reproducido el 2026-09-10
--  contra el proyecto viejo, que conserva el enum original:
--
--      {"code":"22P02","message":"invalid input value for enum
--       gallery_item_type: \"design\""}
--
--  y `getGaleria` propaga el error: /servicios/diseno-cad-impresion-3d y
--  /admin/galeria-diseno responderían 500. El resumen del admin (/admin) NO se
--  ve afectado: cuenta la galería con una sola consulta sin filtro.
--
--  Es aditivo y no puede romper nada: no toca filas existentes ni cambia
--  permisos. Las policies de `gallery_item` ("public read" y "admin write")
--  no filtran por tipo, así que cubren el valor nuevo sin cambios.
--
--  Se deja separado del commit de código (regla DevOps: `wrangler rollback`
--  no revierte la base). Y un valor de enum no se puede quitar con un simple
--  ALTER TYPE: si hubiera que deshacerlo, habría que recrear el tipo.
-- ============================================================================

alter type gallery_item_type add value if not exists 'design';

-- Verificación: debe listar accessories, projects, design.
select unnest(enum_range(null::gallery_item_type)) as tipo;
