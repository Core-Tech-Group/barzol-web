# Referencia rápida de tablas — para escribir INSERTs a mano

Generado desde `supabase/schema.sql` (fuente de verdad). Node: `id` de cada tabla es `integer GENERATED ALWAYS AS IDENTITY` — **nunca lo incluyas en el INSERT**, Postgres lo asigna solo. Usá `RETURNING id` si necesitás el id recién creado para encadenar el siguiente INSERT.

## Orden de carga (respeta FKs)

1. `admin_profile` (opcional por ahora, nada la usa todavía)
2. `vendor`
3. `category` (primero las raíz con `parent_category_id = NULL`, después las subcategorías apuntando a esas)
4. `product` (necesita `vendor_id` y `category_id` ya creados)
5. `product_photo`, `product_feature` (necesitan `product_id`)
6. `gallery_item` (independiente)
7. `home_hero_image` (independiente)
8. `home_item`
9. `home_section_product` (necesita `home_item_id` y `product_id`)
10. `site_configuration` (una sola fila, siempre)

---

## `vendor`

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| name | varchar(100) | sí | — | |

```sql
insert into vendor (name) values ('BARZOL');
```

---

## `category`

Autorreferenciada: una subcategoría es una fila con `parent_category_id` apuntando a otra categoría.

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| parent_category_id | integer | no | NULL | NULL = categoría raíz (instrumento). Con valor = subcategoría |
| code | integer | sí | — | único en toda la tabla, numérico de inventario |
| name | varchar(120) | sí | — | |
| sort_order | int | no | 0 | orden dentro de su nivel |
| is_active | boolean | no | true | |

```sql
-- Raíz (instrumento)
insert into category (code, name, sort_order) values (1000, 'Trompeta', 0) returning id;
-- supongamos que devolvió id = 1

-- Subcategoría (usa el id de arriba)
insert into category (parent_category_id, code, name, sort_order) values (1, 2000, 'Soporte de celular', 0);
```

**Regla importante:** `product.category_id` (más abajo) solo puede apuntar a una categoría que **no tenga hijos** (una "hoja") — o sea, a una subcategoría, nunca al instrumento raíz directamente. Si el instrumento no tiene subcategorías propias, primero hay que crearle al menos una.

---

## `product`

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| code | integer | sí | — | único, numérico de inventario |
| name | varchar(255) | sí | — | |
| description | text | no | NULL | |
| keywords | varchar(500) | no | NULL | texto libre para búsqueda |
| price | numeric(10,2) | sí | — | |
| original_price | numeric(10,2) | no | NULL | precio tachado, si aplica |
| vendor_id | integer | sí | — | FK → `vendor.id` |
| category_id | integer | sí | — | FK → `category.id`, **debe ser una hoja** (trigger lo valida al insertar) |
| status | `product_status` | no | `'draft'` | `'draft'` \| `'published'` |
| is_active | boolean | no | true | |
| is_personalizable | boolean | no | false | |
| sort_order | int | no | 0 | |

```sql
insert into product (code, name, description, keywords, price, original_price, vendor_id, category_id, status, is_active, is_personalizable)
values (5000, 'Soporte de Celular Trompeta', 'Incorpora un mejor ángulo...', 'soporte celular trompeta', 160.00, 180.00, 1, 2, 'published', true, true)
returning id;
```

Si `category_id` apunta a una categoría que sí tiene subcategorías, el INSERT falla con:
`category_id % no es una categoría hoja (tiene subcategorías)`

---

## `product_photo`

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| product_id | integer | sí | — | FK → `product.id` |
| url | text | sí | — | URL de la imagen (Cloudflare R2 u otro host mientras tanto) |
| sort_order | int | no | 0 | `0` = foto principal |

```sql
insert into product_photo (product_id, url, sort_order) values (1, 'https://.../foto1.jpg', 0);
```

---

## `product_feature`

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| product_id | integer | sí | — | FK → `product.id` |
| content | varchar(300) | sí | — | un bullet de característica |
| sort_order | int | no | 0 | |

```sql
insert into product_feature (product_id, content, sort_order) values (1, 'Ajuste seguro y firme.', 0);
```

---

## `gallery_item`

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| type | `gallery_item_type` | sí | — | `'accessories'` \| `'projects'` |
| image_url | text | sí | — | |
| title | varchar(200) | no | NULL | caption bajo la foto |
| sort_order | int | no | 0 | |

```sql
insert into gallery_item (type, image_url, title, sort_order) values ('accessories', 'https://.../foto.jpg', 'Soporte grabado con nombre', 0);
```

---

## `home_hero_image`

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| image_url | text | sí | — | |
| sort_order | int | no | 0 | convención: 0, 1, 2 (hasta 3 filas) |

```sql
insert into home_hero_image (image_url, sort_order) values ('https://.../hero1.jpg', 0);
```

---

## `home_item`

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| type | varchar(20) | sí | — | `'section'` \| `'banner'` (CHECK) |
| title | varchar(150) | no | NULL | solo aplica a `'section'` |
| is_visible | boolean | no | true | |
| sort_order | int | no | 0 | orden combinado entre secciones y banners |
| image_url | text | no | NULL | solo aplica a `'banner'` |
| link | varchar(255) | no | NULL | solo aplica a `'banner'` |

```sql
insert into home_item (type, title, sort_order) values ('section', 'Soportes para celular', 0) returning id;
insert into home_item (type, sort_order, image_url, link) values ('banner', 1, 'https://.../banner.jpg', '/catalogo/trompeta');
```

---

## `home_section_product` (tabla puente)

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| home_item_id | integer | sí | — | FK → `home_item.id` (debe ser uno con `type = 'section'`) |
| product_id | integer | sí | — | FK → `product.id` |
| sort_order | int | no | 0 | |

```sql
insert into home_section_product (home_item_id, product_id, sort_order) values (1, 1, 0);
```

---

## `site_configuration` (singleton — solo puede existir 1 fila)

| Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| whatsapp_number | varchar(20) | sí | — | |
| contact_email | varchar(255) | sí | — | |
| instagram_url | varchar(150) | no | NULL | |
| facebook_url | varchar(150) | no | NULL | |
| address | varchar(300) | no | NULL | |

```sql
insert into site_configuration (whatsapp_number, contact_email, instagram_url, facebook_url, address)
values ('51950759032', 'atencioncliente@barzol.com', null, null, null);
```

Si ya insertaste una fila y querés cambiar los valores, es `update`, no un segundo `insert` (el índice único `site_configuration_singleton` rechaza una segunda fila):

```sql
update site_configuration set whatsapp_number = '51950759032';
```

---

## Enums disponibles

```sql
-- product_status
'draft' | 'published'

-- gallery_item_type
'accessories' | 'projects'
```

## Nota sobre RLS

Después de insertar datos, si tu web sigue mostrando 0 resultados, revisá que existan las policies de lectura pública (ver `supabase/schema.sql` no las incluye — hay que agregarlas aparte, se documentaron en la conversación).
