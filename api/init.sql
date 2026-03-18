-- Схема БД для сайта Очаги и Камины KZ

CREATE TABLE IF NOT EXISTS products (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('bowl','table','oven')),
  badge      TEXT NOT NULL,
  price      INTEGER NOT NULL,
  specs      JSONB NOT NULL DEFAULT '[]',
  image_url  TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_options (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- =====================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ: 11 товаров
-- =====================================================================

-- 1. Классическая костровая чаша D=1200мм
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(1, 'Классическая костровая чаша D=1200мм', 'bowl', 'Костровая чаша', 180000,
 '[{"label":"Размер","value":"1200 × 1200 × 860 мм"},{"label":"Сталь","value":"Холоднокатаная, 1.0 мм"},{"label":"Покрытие","value":"Жаропрочное до 600°C"}]',
 1);

INSERT INTO product_options (product_id, name, price, sort_order) VALUES
(1, 'Поддон для угля', 7000, 1),
(1, 'Решётка-гриль с электроприводом', 15000, 2),
(1, 'Чехол', 8000, 3),
(1, 'Кастрюля', 15000, 4),
(1, 'Подставка для кастрюли', 3000, 5);

-- 2. Усовершенствованная D=1200мм
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(2, 'Усовершенствованная костровая чаша с нерж. решёткой D=1200мм', 'bowl', 'Костровая чаша', 200000,
 '[{"label":"Размер","value":"1200 × 1200 × 460 мм"},{"label":"Сталь","value":"Холоднокатаная, 1.0 мм"},{"label":"Решётка","value":"Нержавеющая сталь"}]',
 2);

INSERT INTO product_options (product_id, name, price, sort_order) VALUES
(2, 'Поддон для угля', 7000, 1),
(2, 'Решётка-гриль с электроприводом', 15000, 2),
(2, 'Чехол', 8000, 3),
(2, 'Кастрюля', 15000, 4),
(2, 'Подставка для кастрюли', 3000, 5);

-- 3. Классическая D=900мм
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(3, 'Классическая костровая чаша D=900мм', 'bowl', 'Костровая чаша', 130000,
 '[{"label":"Размер","value":"900 × 900 × 640 мм"},{"label":"Сталь","value":"Холоднокатаная, 0.8 мм"},{"label":"Покрытие","value":"Жаропрочное до 600°C"}]',
 3);

INSERT INTO product_options (product_id, name, price, sort_order) VALUES
(3, 'Чехол', 8000, 1);

-- 4. Усовершенствованная D=900мм
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(4, 'Усовершенствованная костровая чаша с нерж. решёткой D=900мм', 'bowl', 'Костровая чаша', 150000,
 '[{"label":"Размер","value":"900 × 900 × 710 мм"},{"label":"Сталь","value":"Холоднокатаная, 0.6 мм"},{"label":"Решётка","value":"Нержавеющая сталь"}]',
 4);

INSERT INTO product_options (product_id, name, price, sort_order) VALUES
(4, 'Чехол', 8000, 1);

-- 5. Простая D=900мм
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(5, 'Простая костровая чаша D=900мм', 'bowl', 'Костровая чаша', 120000,
 '[{"label":"Размер","value":"900 × 900 мм"},{"label":"Сталь","value":"Холоднокатаная"},{"label":"Покрытие","value":"Жаропрочное до 600°C"}]',
 5);

-- 6. Круглый стол D=1200мм
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(6, 'Круглый стол D=1200мм', 'table', 'Стол', 200000,
 '[{"label":"Размер","value":"1200 × 1200 × 730 мм"},{"label":"Столешница","value":"Сталь 3.0 мм"},{"label":"Покрытие","value":"Жаропрочное до 600°C"}]',
 6);

INSERT INTO product_options (product_id, name, price, sort_order) VALUES
(6, 'Индукционная плита D=32 см', 30000, 1);

-- 7. Печь «Петербург» с коротким дымоходом
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(7, 'Печь «Петербург» с коротким дымоходом', 'oven', 'Печь', 250000,
 '[{"label":"Размер","value":"1240 × 750 × 750 мм"},{"label":"Отделка","value":"Медная обработка кромок"},{"label":"Гриль","value":"Вращающийся, 3 уровня"}]',
 7);

INSERT INTO product_options (product_id, name, price, sort_order) VALUES
(7, 'Чугунная сковорода', 15000, 1);

-- 8. Печь «Петербург» с длинным дымоходом
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(8, 'Печь «Петербург» с длинным дымоходом', 'oven', 'Печь', 270000,
 '[{"label":"Размер","value":"1740 × 750 × 750 мм"},{"label":"Отделка","value":"Медная обработка кромок"},{"label":"Гриль","value":"Вращающийся, 3 уровня"}]',
 8);

INSERT INTO product_options (product_id, name, price, sort_order) VALUES
(8, 'Чугунная сковорода', 15000, 1);

-- 9. Квадратная печь с коротким дымоходом
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(9, 'Квадратная печь с коротким дымоходом', 'oven', 'Печь', 180000,
 '[{"label":"Размер","value":"1220 × 600 × 600 мм"},{"label":"Сталь","value":"Холоднокатаная"},{"label":"Гриль","value":"Вращающийся, 2 уровня"}]',
 9);

-- 10. Квадратная печь с длинным дымоходом
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(10, 'Квадратная печь с длинным дымоходом', 'oven', 'Печь', 200000,
 '[{"label":"Размер","value":"1750 × 600 × 600 мм"},{"label":"Сталь","value":"Холоднокатаная"},{"label":"Гриль","value":"Вращающийся, 2 уровня"}]',
 10);

-- 11. Костровая чаша «Сфера» D=900мм
INSERT INTO products (id, name, category, badge, price, specs, sort_order) VALUES
(11, 'Костровая чаша «Сфера» D=900мм', 'bowl', 'Костровая чаша', 110000,
 '[{"label":"Размер","value":"840 × 840 × 380 мм"},{"label":"Сталь","value":"Холоднокатаная"},{"label":"Покрытие","value":"Жаропрочное до 600°C"}]',
 11);

INSERT INTO product_options (product_id, name, price, sort_order) VALUES
(11, 'Решётка из нерж. стали', 10000, 1);

-- Сбросить sequence чтобы следующий auto ID шёл после 11
SELECT setval('products_id_seq', 11);
