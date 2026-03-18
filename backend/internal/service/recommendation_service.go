package service

import (
	"context"
	"errors"

	"ochag-kz/internal/model"
	"ochag-kz/internal/repository"
)

const maxRecommendations = 4

var (
	ErrSelfRecommendation = errors.New("product cannot recommend itself")
	ErrTooManyRecommendations = errors.New("too many recommendations (max 10)")
)

type RecommendationService struct {
	recRepo     repository.RecommendationRepository
	productRepo repository.ProductRepository
}

func NewRecommendationService(recRepo repository.RecommendationRepository, productRepo repository.ProductRepository) *RecommendationService {
	return &RecommendationService{recRepo: recRepo, productRepo: productRepo}
}

// GetRecommendations returns manual recommendations for a product,
// or falls back to same-category products if none are set.
func (s *RecommendationService) GetRecommendations(ctx context.Context, productID int64) ([]model.Product, error) {
	recs, err := s.recRepo.GetByProductID(ctx, productID)
	if err != nil {
		return nil, err
	}
	if len(recs) > 0 {
		return recs, nil
	}

	return s.fallbackRecommendations(ctx, productID)
}

// GetRecommendationsMap returns recommendations for multiple products (batch).
// Products without manual recommendations get same-category fallback.
func (s *RecommendationService) GetRecommendationsMap(ctx context.Context, products []model.Product, limit int) (map[int64][]model.Product, error) {
	if len(products) == 0 {
		return make(map[int64][]model.Product), nil
	}

	ids := make([]int64, len(products))
	for i, p := range products {
		ids[i] = p.ID
	}

	recsMap, err := s.recRepo.GetByProductIDs(ctx, ids)
	if err != nil {
		return nil, err
	}

	// Build category index for fallback
	categoryProducts := make(map[string][]model.Product)
	for _, p := range products {
		categoryProducts[p.Category] = append(categoryProducts[p.Category], p)
	}

	result := make(map[int64][]model.Product, len(products))
	for _, p := range products {
		recs := recsMap[p.ID]
		if len(recs) == 0 {
			// Fallback: same-category products, excluding self
			for _, cp := range categoryProducts[p.Category] {
				if cp.ID != p.ID {
					recs = append(recs, cp)
					if len(recs) >= limit {
						break
					}
				}
			}
		} else if len(recs) > limit {
			recs = recs[:limit]
		}
		if len(recs) > 0 {
			result[p.ID] = recs
		}
	}

	return result, nil
}

// SetRecommendations sets manual recommendations for a product.
func (s *RecommendationService) SetRecommendations(ctx context.Context, productID int64, recommendedIDs []int64) error {
	if len(recommendedIDs) > 10 {
		return ErrTooManyRecommendations
	}

	for _, id := range recommendedIDs {
		if id == productID {
			return ErrSelfRecommendation
		}
	}

	// Verify product exists
	_, err := s.productRepo.GetByID(ctx, productID)
	if err != nil {
		return ErrProductNotFound
	}

	return s.recRepo.SetForProduct(ctx, productID, recommendedIDs)
}

// GetRecommendedIDs returns just the IDs of manually set recommendations.
func (s *RecommendationService) GetRecommendedIDs(ctx context.Context, productID int64) ([]int64, error) {
	return s.recRepo.GetRecommendedIDs(ctx, productID)
}

func (s *RecommendationService) fallbackRecommendations(ctx context.Context, productID int64) ([]model.Product, error) {
	product, err := s.productRepo.GetByID(ctx, productID)
	if err != nil {
		return nil, err
	}

	categoryProducts, err := s.productRepo.GetByCategory(ctx, product.Category)
	if err != nil {
		return nil, err
	}

	var recs []model.Product
	for _, p := range categoryProducts {
		if p.ID != productID {
			recs = append(recs, p)
			if len(recs) >= maxRecommendations {
				break
			}
		}
	}
	return recs, nil
}
