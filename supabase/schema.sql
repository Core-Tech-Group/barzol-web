-- =========================================================
-- Barzol Web — DDL completo
-- Motor: PostgreSQL (Supabase)
-- Orden de ejecución: de arriba hacia abajo, respeta dependencias
-- =========================================================
 
 
-- =========================================================
-- 1. TIPOS ENUM
-- =========================================================
 
CREATE TYPE product_status AS ENUM ('draft', 'published');
-- Para agregar un estado nuevo más adelante (ej. 'agotado'):
--   ALTER TYPE product_status ADD VALUE 'agotado';
 
CREATE TYPE gallery_item_type AS ENUM ('accessories', 'projects');
 
 
-- =========================================================
-- 2. FUNCIÓN COMPARTIDA: auto-actualizar updated_at
-- =========================================================
 
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
 
-- =========================================================
-- 3. ADMIN_PROFILE
-- Extiende auth.users de Supabase (no la reemplaza).
-- id es UUID por excepción: debe coincidir con auth.users.id
-- =========================================================
 
CREATE TABLE admin_profile (
    id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username      varchar(50) UNIQUE,              -- nullable: solo si el login es por usuario simple
    name          varchar(100) NOT NULL,
    role          varchar(30) NOT NULL DEFAULT 'admin',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
 
CREATE TRIGGER trg_admin_profile_updated_at
    BEFORE UPDATE ON admin_profile
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
 
-- =========================================================
-- 4. VENDOR
-- =========================================================
 
CREATE TABLE vendor (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          varchar(100) NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL,
    updated_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
CREATE TRIGGER trg_vendor_updated_at
    BEFORE UPDATE ON vendor
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
 
-- =========================================================
-- 5. CATEGORY
-- Autorreferenciada — árbol de profundidad libre
-- =========================================================
 
CREATE TABLE category (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_category_id  integer REFERENCES category(id) ON DELETE CASCADE,
    code                integer NOT NULL UNIQUE,     -- numérico, uso interno/inventario
    name                varchar(120) NOT NULL,
    sort_order          int NOT NULL DEFAULT 0,
    is_active           boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    created_by          uuid REFERENCES admin_profile(id) ON DELETE SET NULL,
    updated_by          uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
CREATE INDEX idx_category_parent ON category(parent_category_id);
 
CREATE TRIGGER trg_category_updated_at
    BEFORE UPDATE ON category
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
 
-- =========================================================
-- 6. PRODUCT
-- category_id debe apuntar a una categoría "hoja" (sin subcategorías)
-- vendor_id / category_id usan RESTRICT: no se puede borrar una marca
-- o categoría mientras tenga productos asociados
-- =========================================================
 
CREATE TABLE product (
    id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code               integer NOT NULL UNIQUE,      -- numérico, uso interno/inventario
    name               varchar(255) NOT NULL,
    description        text,
    keywords           varchar(500),
    price              numeric(10,2) NOT NULL,
    original_price     numeric(10,2),
    vendor_id          integer NOT NULL REFERENCES vendor(id) ON DELETE RESTRICT,
    category_id        integer NOT NULL REFERENCES category(id) ON DELETE RESTRICT,
    status             product_status NOT NULL DEFAULT 'draft',
    is_active          boolean NOT NULL DEFAULT true,
    is_personalizable  boolean NOT NULL DEFAULT false,
    sort_order         int NOT NULL DEFAULT 0,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    created_by         uuid REFERENCES admin_profile(id) ON DELETE SET NULL,
    updated_by         uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
CREATE INDEX idx_product_category ON product(category_id);
CREATE INDEX idx_product_vendor ON product(vendor_id);
CREATE INDEX idx_product_status ON product(status) WHERE is_active = true;
 
CREATE TRIGGER trg_product_updated_at
    BEFORE UPDATE ON product
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
-- Regla de negocio: category_id debe ser una categoría "hoja"
-- (sin subcategorías propias) — no se puede validar con un CHECK simple
CREATE OR REPLACE FUNCTION check_product_category_is_leaf()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM category WHERE parent_category_id = NEW.category_id
    ) THEN
        RAISE EXCEPTION
            'category_id % no es una categoría hoja (tiene subcategorías)',
            NEW.category_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER trg_product_category_leaf
    BEFORE INSERT OR UPDATE OF category_id ON product
    FOR EACH ROW EXECUTE FUNCTION check_product_category_is_leaf();
 
 
-- =========================================================
-- 7. PRODUCT_PHOTO (hasta 5 por producto, reordenables)
-- =========================================================
 
CREATE TABLE product_photo (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id    integer NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    url           text NOT NULL,
    sort_order    int NOT NULL DEFAULT 0,   -- sort_order = 0 es la foto principal
    created_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
CREATE INDEX idx_product_photo_product ON product_photo(product_id);
 
 
-- =========================================================
-- 8. PRODUCT_FEATURE (bullets de características)
-- =========================================================
 
CREATE TABLE product_feature (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id    integer NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    content       varchar(300) NOT NULL,
    sort_order    int NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
CREATE INDEX idx_product_feature_product ON product_feature(product_id);
 
 
-- =========================================================
-- 9. GALLERY_ITEM (accesorios personalizados / trabajos de ingeniería)
-- =========================================================
 
CREATE TABLE gallery_item (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type          gallery_item_type NOT NULL,
    image_url     text NOT NULL,
    title         varchar(200),
    sort_order    int NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL,
    updated_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
CREATE INDEX idx_gallery_item_type ON gallery_item(type);
 
CREATE TRIGGER trg_gallery_item_updated_at
    BEFORE UPDATE ON gallery_item
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
 
-- =========================================================
-- 10. HOME_HERO_IMAGE (máx. 3, orden 0-2)
-- =========================================================
 
CREATE TABLE home_hero_image (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    image_url     text NOT NULL,
    sort_order    int NOT NULL DEFAULT 0,   -- convención: 0, 1, 2 (hasta 3 filas)
    created_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
 
-- =========================================================
-- 11. HOME_ITEM (secciones y banners intercalados)
-- =========================================================
 
CREATE TABLE home_item (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type          varchar(20) NOT NULL CHECK (type IN ('section', 'banner')),
    title         varchar(150),              -- nullable, solo aplica a 'section'
    is_visible    boolean NOT NULL DEFAULT true,
    sort_order    int NOT NULL DEFAULT 0,
    image_url     text,                      -- nullable, solo aplica a 'banner'
    link          varchar(255),              -- nullable, solo aplica a 'banner'
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    created_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL,
    updated_by    uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
CREATE TRIGGER trg_home_item_updated_at
    BEFORE UPDATE ON home_item
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
 
-- =========================================================
-- 12. HOME_SECTION_PRODUCT (tabla puente)
-- =========================================================
 
CREATE TABLE home_section_product (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    home_item_id   integer NOT NULL REFERENCES home_item(id) ON DELETE CASCADE,
    product_id     integer NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    sort_order     int NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    created_by     uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
CREATE INDEX idx_home_section_product_item ON home_section_product(home_item_id);
CREATE INDEX idx_home_section_product_product ON home_section_product(product_id);
 
 
-- =========================================================
-- 13. SITE_CONFIGURATION (singleton — siempre una sola fila)
-- =========================================================
 
CREATE TABLE site_configuration (
    id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    whatsapp_number   varchar(20) NOT NULL,
    contact_email     varchar(255) NOT NULL,
    instagram_url     varchar(150),
    facebook_url      varchar(150),
    address           varchar(300),
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    created_by        uuid REFERENCES admin_profile(id) ON DELETE SET NULL,
    updated_by        uuid REFERENCES admin_profile(id) ON DELETE SET NULL
);
 
-- Fuerza que la tabla nunca tenga más de 1 fila
CREATE UNIQUE INDEX site_configuration_singleton ON site_configuration ((true));
 
CREATE TRIGGER trg_site_configuration_updated_at
    BEFORE UPDATE ON site_configuration
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
 
 
-- =========================================================
-- FIN DEL SCRIPT
-- Pendiente para una futura iteración (no incluido aquí):
--   - alt_text en tablas de imágenes (product_photo, gallery_item,
--     home_hero_image, home_item.image_url)
-- =========================================================