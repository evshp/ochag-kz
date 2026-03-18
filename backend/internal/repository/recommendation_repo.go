package repository

import (
	"context"
	"ochag-kz/internal/model"
)

type RecommendationRepository interface {
	GetByProductID(ctx context.Context, productID int64) ([]model.Product, error)
	GetByProductIDs(ctx context.Context, productIDs []int64) (map[int64][]model.Product, error)
	SetForProduct(ctx context.Context, productID int64, recommendedIDs []int64) error
	GetRecommendedIDs(ctx context.Context, productID int64) ([]int64, error)
}
