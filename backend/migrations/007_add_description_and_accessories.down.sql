-- Remove recommendations linking to accessories
DELETE FROM product_recommendations WHERE recommended_product_id IN (SELECT id FROM products WHERE category = 'accessory');

-- Remove accessory products
DELETE FROM products WHERE category = 'accessory';

-- Remove description column
ALTER TABLE products DROP COLUMN IF EXISTS description;
