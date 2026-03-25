-- Revert image URLs to empty
UPDATE products SET image_url = '' WHERE id <= 11;
