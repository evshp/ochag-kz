package postgres

import (
	"context"
	"fmt"

	"ochag-kz/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RecommendationRepo struct {
	pool *pgxpool.Pool
}

func NewRecommendationRepo(pool *pgxpool.Pool) *RecommendationRepo {
	return &RecommendationRepo{pool: pool}
}

func (r *RecommendationRepo) GetByProductID(ctx context.Context, productID int64) ([]model.Product, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.name, p.category, p.badge, p.price, p.image_url, COALESCE(i.quantity, 0)
		FROM product_recommendations pr
		JOIN products p ON p.id = pr.recommended_product_id
		LEFT JOIN inventory i ON i.product_id = p.id
		WHERE pr.product_id = $1
		ORDER BY pr.sort_order, pr.id`, productID)
	if err != nil {
		return nil, fmt.Errorf("query recommendations: %w", err)
	}
	defer rows.Close()

	var products []model.Product
	for rows.Next() {
		var p model.Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Category, &p.Badge, &p.Price, &p.ImageURL, &p.StockQuantity); err != nil {
			return nil, fmt.Errorf("scan recommendation: %w", err)
		}
		products = append(products, p)
	}
	return products, nil
}

func (r *RecommendationRepo) GetByProductIDs(ctx context.Context, productIDs []int64) (map[int64][]model.Product, error) {
	if len(productIDs) == 0 {
		return make(map[int64][]model.Product), nil
	}

	rows, err := r.pool.Query(ctx, `
		SELECT pr.product_id, p.id, p.name, p.category, p.badge, p.price, p.image_url, COALESCE(i.quantity, 0)
		FROM product_recommendations pr
		JOIN products p ON p.id = pr.recommended_product_id
		LEFT JOIN inventory i ON i.product_id = p.id
		WHERE pr.product_id = ANY($1)
		ORDER BY pr.product_id, pr.sort_order, pr.id`, productIDs)
	if err != nil {
		return nil, fmt.Errorf("query batch recommendations: %w", err)
	}
	defer rows.Close()

	result := make(map[int64][]model.Product)
	for rows.Next() {
		var srcID int64
		var p model.Product
		if err := rows.Scan(&srcID, &p.ID, &p.Name, &p.Category, &p.Badge, &p.Price, &p.ImageURL, &p.StockQuantity); err != nil {
			return nil, fmt.Errorf("scan batch recommendation: %w", err)
		}
		result[srcID] = append(result[srcID], p)
	}
	return result, nil
}

func (r *RecommendationRepo) SetForProduct(ctx context.Context, productID int64, recommendedIDs []int64) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "DELETE FROM product_recommendations WHERE product_id = $1", productID)
	if err != nil {
		return fmt.Errorf("delete old recommendations: %w", err)
	}

	for i, recID := range recommendedIDs {
		_, err = tx.Exec(ctx,
			"INSERT INTO product_recommendations (product_id, recommended_product_id, sort_order) VALUES ($1, $2, $3)",
			productID, recID, i)
		if err != nil {
			return fmt.Errorf("insert recommendation: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *RecommendationRepo) GetRecommendedIDs(ctx context.Context, productID int64) ([]int64, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT recommended_product_id FROM product_recommendations WHERE product_id = $1 ORDER BY sort_order, id",
		productID)
	if err != nil {
		return nil, fmt.Errorf("query recommended ids: %w", err)
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan recommended id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, nil
}
