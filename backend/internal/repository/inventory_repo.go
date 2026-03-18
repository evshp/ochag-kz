package repository

import (
	"context"
	"ochag-kz/internal/model"
)

type InventoryRepository interface {
	GetAll(ctx context.Context) ([]model.InventoryItem, error)
	GetByProductID(ctx context.Context, productID int64) (*model.InventoryItem, error)
	AdjustQuantity(ctx context.Context, productID int64, delta int, reason string) error
	GetLogs(ctx context.Context, productID int64) ([]model.InventoryLog, error)
	EnsureExists(ctx context.Context, productID int64) error
}
