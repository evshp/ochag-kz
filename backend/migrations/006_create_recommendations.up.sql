CREATE TABLE product_recommendations (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recommended_product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE(product_id, recommended_product_id),
    CHECK(product_id != recommended_product_id)
);

CREATE INDEX idx_recommendations_product_id ON product_recommendations(product_id);
