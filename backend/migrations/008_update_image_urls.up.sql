-- Update image URLs to local paths (idempotent, won't overwrite if already set to local path)
UPDATE products SET image_url = '/assets/products/product-' || id || '.jpg'
WHERE id <= 11 AND (image_url = '' OR image_url LIKE 'https://drive.google.com/%' OR image_url LIKE 'https://ibb.co/%');
