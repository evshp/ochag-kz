package repository

import (
	"context"
	"ochag-kz/internal/model"
)

type ProductRepository interface {
	GetAll(ctx context.Context) ([]model.Product, error)
	GetByCategory(ctx context.Context, category string) ([]model.Product, error)
	GetByID(ctx context.Context, id int64) (*model.Product, error)
	Create(ctx context.Context, product *model.Product) (int64, error)
	Update(ctx context.Context, product *model.Product) error
	Delete(ctx context.Context, id int64) error
}
