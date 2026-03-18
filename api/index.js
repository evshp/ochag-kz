const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ochag',
  user: process.env.DB_USER || 'ochag_user',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Получить все товары с опциями
app.get('/api/products', async (req, res) => {
  try {
    const productsRes = await pool.query(
      'SELECT * FROM products ORDER BY sort_order, id'
    );
    const optionsRes = await pool.query(
      'SELECT * FROM product_options ORDER BY product_id, sort_order'
    );

    const optionsByProduct = {};
    for (const opt of optionsRes.rows) {
      if (!optionsByProduct[opt.product_id]) optionsByProduct[opt.product_id] = [];
      optionsByProduct[opt.product_id].push(opt);
    }

    const products = productsRes.rows.map(p => ({
      ...p,
      options: optionsByProduct[p.id] || [],
    }));

    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создать товар
app.post('/api/products', requireAdmin, async (req, res) => {
  const { name, category, badge, price, specs, image_url, sort_order } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (name, category, badge, price, specs, image_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, category, badge, price, JSON.stringify(specs || []), image_url || null, sort_order || 0]
    );
    res.status(201).json({ ...result.rows[0], options: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить товар
app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const { name, category, badge, price, specs, image_url, sort_order } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products SET name=$1, category=$2, badge=$3, price=$4, specs=$5,
       image_url=$6, sort_order=$7 WHERE id=$8 RETURNING *`,
      [name, category, badge, price, JSON.stringify(specs || []), image_url || null, sort_order || 0, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });

    const optionsRes = await pool.query(
      'SELECT * FROM product_options WHERE product_id=$1 ORDER BY sort_order',
      [req.params.id]
    );
    res.json({ ...result.rows[0], options: optionsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить товар (опции удалятся каскадом)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Добавить опцию к товару
app.post('/api/products/:id/options', requireAdmin, async (req, res) => {
  const { name, price, sort_order } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO product_options (product_id, name, price, sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, name, price, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить опцию
app.put('/api/options/:id', requireAdmin, async (req, res) => {
  const { name, price, sort_order } = req.body;
  try {
    const result = await pool.query(
      'UPDATE product_options SET name=$1, price=$2, sort_order=$3 WHERE id=$4 RETURNING *',
      [name, price, sort_order || 0, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удалить опцию
app.delete('/api/options/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM product_options WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
