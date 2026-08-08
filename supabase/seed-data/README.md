# Seed data — el catálogo de prueba que usamos en el mock

Es la misma data (7 categorías con subcategorías, 16 productos, galería, etc.) que estuvo en los servicios mock durante el desarrollo, exportada a JSON para que puedas armar los INSERTs reales.

No usan los ids de mentira del mock (`cat-trompeta`, `prod-...`) porque esos no existen en la base real — usan **`codigo`** / **`code`** (el campo numérico de negocio de `supabase/schema.sql`) como referencia estable entre archivos, ya que el `id` autonumérico real solo se conoce después de insertar.

## Orden de carga

1. `vendor.json`
2. `categorias.json` — insertá primero todas las raíz (`codigo` 1000-1006), después sus `subcategorias` con `parent_category_id` apuntando al `id` real que te devolvió la raíz
3. `productos.json` — cada producto trae `subcategoria_codigo`: buscá qué `id` real le quedó a esa subcategoría (paso anterior) y usalo como `category_id`. `instrumento` es solo informativo, no se inserta en ningún lado (se deriva solo, ver `productoMapper.ts`)
4. `galeria.json`
5. `home_hero_images.json`
6. `home_items.json` — cada `section` trae `productos_codigo`: después de insertar el `home_item`, insertá una fila en `home_section_product` por cada código, buscando el `id` real de ese producto
7. `configuracion.json` — una sola fila

## ⚠️ Antes de insertar `galeria.json` y `home_hero_images.json`

Esas dos tablas tienen `image_url` como **obligatorio** (`NOT NULL`) en el schema real — en el mock siempre fue `null` porque no había fotos todavía. Reemplazá todos los `"REEMPLAZAR_URL_IMAGEN"` por URLs reales antes de insertar, o el INSERT va a fallar.

`home_items.json` no tiene este problema: ahí `image_url` si es opcional (solo lo usan los banners).

## Regla que puede rechazar un INSERT de producto

`product.category_id` tiene que apuntar a una categoría **hoja** (una subcategoría, nunca al instrumento raíz). Si insertás las subcategorías de `categorias.json` antes que los productos, no deberías chocar con esto — está mencionado igual porque es la causa más probable de un error al insertar productos.
