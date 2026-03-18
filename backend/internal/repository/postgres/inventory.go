package postgres

import (
	"context"
	"fmt"

	"ochag-kz/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type InventoryRepo struct {
	pool *pgxpool.Pool
}

func NewInventoryRepo(pool *pgxpool.Pool) *InventoryRepo {
	return &InventoryRepo{pool: pool}
}

func (r *InventoryRepo) GetAll(ctx context.Context) ([]model.InventoryItem, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT i.id, i.product_id, i.quantity, i.updated_at FROM inventory i ORDER BY i.product_id")
	if err != nil {
		return nil, fmt.Errorf("query inventory: %w", err)
	}
	defer rows.Close()

	var items []model.InventoryItem
	for rows.Next() {
		var item model.InventoryItem
		if err := rows.Scan(&item.ID, &item.ProductID, &item.Quantity, &item.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan inventory: %w", err)
		}
		items = append(items, item)
	}
	return items, nil
}

func (r *InventoryRepo) GetByProductID(ctx context.Context, productID int64) (*model.InventoryItem, error) {
	var item model.InventoryItem
	err := r.pool.QueryRow(ctx,
		"SELECT id, product_id, quantity, updated_at FROM inventory WHERE product_id = $1", productID,
	).Scan(&item.ID, &item.ProductID, &item.Quantity, &item.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("query inventory by product_id: %w", err)
	}
	return &item, nil
}

func (r *InventoryRepo) AdjustQuantity(ctx context.Context, productID int64, delta int, reason string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update quantity
	_, err = tx.Exec(ctx,
		"UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE product_id = $2",
		delta, productID,
	)
	if err != nil {
		return fmt.Errorf("update inventory: %w", err)
	}

	// Log the change
	_, err = tx.Exec(ctx,
		"INSERT INTO inventory_log (product_id, delta, reason) VALUES ($1, $2, $3)",
		productID, delta, reason,
	)
	if err != nil {
		return fmt.Errorf("insert inventory log: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *InventoryRepo) GetLogs(ctx context.Context, productID int64) ([]model.InventoryLog, error) {
	rows, err := r.pool.Query(ctx,
		"SELECT id, product_id, delta, reason, created_at FROM inventory_log WHERE product_id = $1 ORDER BY created_at DESC LIMIT 50",
		productID,
	)
	if err != nil {
		return nil, fmt.Errorf("query inventory logs: %w", err)
	}
	defer rows.Close()

	var logs []model.InventoryLog
	for rows.Next() {
		var l model.InventoryLog
		if err := rows.Scan(&l.ID, &l.ProductID, &l.Delta, &l.Reason, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan inventory log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}

func (r *InventoryRepo) EnsureExists(ctx context.Context, productID int64) error {
	_, err := r.pool.Exec(ctx,
		"INSERT INTO inventory (product_id, quantity) VALUES ($1, 0) ON CONFLICT (product_id) DO NOTHING",
		productID,
	)
	if err != nil {
		return fmt.Errorf("ensure inventory exists: %w", err)
	}
	return nil
}
