CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    badge VARCHAR(100) NOT NULL,
    price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_specs (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS product_options (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_product_specs_product_id ON product_specs(product_id);
CREATE INDEX idx_product_options_product_id ON product_options(product_id);
