-- Add description column to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- Create accessory products from existing product_options (deduplicated by name+price)
INSERT INTO products (name, category, badge, price, description)
SELECT DISTINCT name, 'accessory', 'Аксессуар', price, ''
FROM product_options
ON CONFLICT DO NOTHING;

-- Create inventory records for new accessory products
INSERT INTO inventory (product_id, quantity)
SELECT id, 0 FROM products WHERE category = 'accessory'
ON CONFLICT (product_id) DO NOTHING;

-- Link accessories as recommendations to their parent products
-- For each product_option, find the matching accessory product and create a recommendation
INSERT INTO product_recommendations (product_id, recommended_product_id, sort_order)
SELECT DISTINCT po_parent.product_id, acc.id, acc.id
FROM product_options po_parent
JOIN products acc ON acc.name = po_parent.name AND acc.price = po_parent.price AND acc.category = 'accessory'
ON CONFLICT (product_id, recommended_product_id) DO NOTHING;
