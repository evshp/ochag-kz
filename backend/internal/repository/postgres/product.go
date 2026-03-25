package postgres

import (
	"context"
	"fmt"

	"ochag-kz/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductRepo struct {
	pool *pgxpool.Pool
}

func NewProductRepo(pool *pgxpool.Pool) *ProductRepo {
	return &ProductRepo{pool: pool}
}

func (r *ProductRepo) GetAll(ctx context.Context) ([]model.Product, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT p.id, p.name, p.description, p.category, p.badge, p.price, p.image_url, COALESCE(i.quantity, 0) FROM products p LEFT JOIN inventory i ON i.product_id = p.id ORDER BY p.id")
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Badge, &p.Price, &p.ImageURL, &p.StockQuantity); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, p)
	}

	if err := r.loadSpecsAndOptions(ctx, products); err != nil {
		return nil, err
	}

	return products, nil
}

func (r *ProductRepo) GetByCategory(ctx context.Context, category string) ([]model.Product, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT p.id, p.name, p.description, p.category, p.badge, p.price, p.image_url, COALESCE(i.quantity, 0) FROM products p LEFT JOIN inventory i ON i.product_id = p.id WHERE p.category = $1 ORDER BY p.id", category)
	if err != nil {
		return nil, fmt.Errorf("query products by category: %w", err)
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Badge, &p.Price, &p.ImageURL, &p.StockQuantity); err != nil {
			return nil, fmt.Errorf("scan product: %w", err)
		}
		products = append(products, p)
	}

	if err := r.loadSpecsAndOptions(ctx, products); err != nil {
		return nil, err
	}

	return products, nil
}

func (r *ProductRepo) GetByID(ctx context.Context, id int64) (*model.Product, error) {
	var p model.Product
	err := r.pool.QueryRow(ctx,
		"SELECT p.id, p.name, p.description, p.category, p.badge, p.price, p.image_url, COALESCE(i.quantity, 0) FROM products p LEFT JOIN inventory i ON i.product_id = p.id WHERE p.id = $1", id).
		Scan(&p.ID, &p.Name, &p.Description, &p.Category, &p.Badge, &p.Price, &p.ImageURL, &p.StockQuantity)
	if err != nil {
		return nil, fmt.Errorf("query product by id: %w", err)
	}

	products := []model.Product{p}
	if err := r.loadSpecsAndOptions(ctx, products); err != nil {
		return nil, err
	}

	return &products[0], nil
}

func (r *ProductRepo) Create(ctx context.Context, product *model.Product) (int64, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var id int64
	err = tx.QueryRow(ctx,
		"INSERT INTO products (name, description, category, badge, price, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
		product.Name, product.Description, product.Category, product.Badge, product.Price, product.ImageURL,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert product: %w", err)
	}

	for _, s := range product.Specs {
		_, err = tx.Exec(ctx,
			"INSERT INTO product_specs (product_id, label, value) VALUES ($1, $2, $3)",
			id, s.Label, s.Value,
		)
		if err != nil {
			return 0, fmt.Errorf("insert spec: %w", err)
		}
	}

	for _, o := range product.Options {
		_, err = tx.Exec(ctx,
			"INSERT INTO product_options (product_id, name, price) VALUES ($1, $2, $3)",
			id, o.Name, o.Price,
		)
		if err != nil {
			return 0, fmt.Errorf("insert option: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return id, nil
}

func (r *ProductRepo) Update(ctx context.Context, product *model.Product) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		"UPDATE products SET name = $1, description = $2, category = $3, badge = $4, price = $5, image_url = $6 WHERE id = $7",
		product.Name, product.Description, product.Category, product.Badge, product.Price, product.ImageURL, product.ID,
	)
	if err != nil {
		return fmt.Errorf("update product: %w", err)
	}

	// Replace specs
	_, err = tx.Exec(ctx, "DELETE FROM product_specs WHERE product_id = $1", product.ID)
	if err != nil {
		return fmt.Errorf("delete specs: %w", err)
	}
	for _, s := range product.Specs {
		_, err = tx.Exec(ctx,
			"INSERT INTO product_specs (product_id, label, value) VALUES ($1, $2, $3)",
			product.ID, s.Label, s.Value,
		)
		if err != nil {
			return fmt.Errorf("insert spec: %w", err)
		}
	}

	// Replace options
	_, err = tx.Exec(ctx, "DELETE FROM product_options WHERE product_id = $1", product.ID)
	if err != nil {
		return fmt.Errorf("delete options: %w", err)
	}
	for _, o := range product.Options {
		_, err = tx.Exec(ctx,
			"INSERT INTO product_options (product_id, name, price) VALUES ($1, $2, $3)",
			product.ID, o.Name, o.Price,
		)
		if err != nil {
			return fmt.Errorf("insert option: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *ProductRepo) UpdateImageURL(ctx context.Context, id int64, imageURL string) error {
	_, err := r.pool.Exec(ctx, "UPDATE products SET image_url = $1 WHERE id = $2", imageURL, id)
	if err != nil {
		return fmt.Errorf("update image_url: %w", err)
	}
	return nil
}

func (r *ProductRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM products WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete product: %w", err)
	}
	return nil
}

func (r *ProductRepo) loadSpecsAndOptions(ctx context.Context, products []model.Product) error {
	if len(products) == 0 {
		return nil
	}

	ids := make([]int64, len(products))
	idxMap := make(map[int64]int, len(products))
	for i, p := range products {
		ids[i] = p.ID
		idxMap[p.ID] = i
		products[i].Specs = []model.Spec{}
		products[i].Options = []model.ProductOption{}
	}

	// Load specs
	specRows, err := r.pool.Query(ctx,
		"SELECT product_id, label, value FROM product_specs WHERE product_id = ANY($1) ORDER BY id",
		ids,
	)
	if err != nil {
		return fmt.Errorf("query specs: %w", err)
	}
	defer specRows.Close()

	for specRows.Next() {
		var productID int64
		var s model.Spec
		if err := specRows.Scan(&productID, &s.Label, &s.Value); err != nil {
			return fmt.Errorf("scan spec: %w", err)
		}
		if idx, ok := idxMap[productID]; ok {
			products[idx].Specs = append(products[idx].Specs, s)
		}
	}

	// Load options
	optRows, err := r.pool.Query(ctx,
		"SELECT product_id, name, price FROM product_options WHERE product_id = ANY($1) ORDER BY id",
		ids,
	)
	if err != nil {
		return fmt.Errorf("query options: %w", err)
	}
	defer optRows.Close()

	for optRows.Next() {
		var productID int64
		var o model.ProductOption
		if err := optRows.Scan(&productID, &o.Name, &o.Price); err != nil {
			return fmt.Errorf("scan option: %w", err)
		}
		if idx, ok := idxMap[productID]; ok {
			products[idx].Options = append(products[idx].Options, o)
		}
	}

	return nil
}
