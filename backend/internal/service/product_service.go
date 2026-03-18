package service

import (
	"context"
	"errors"

	"ochag-kz/internal/model"
	"ochag-kz/internal/repository"
)

var (
	ErrProductNotFound = errors.New("product not found")
	ErrInvalidCategory = errors.New("invalid category: must be bowl, table, oven, or accessory")
	ErrEmptyName       = errors.New("product name is required")
	ErrInvalidPrice    = errors.New("price must be positive")
)

type ProductService struct {
	repo repository.ProductRepository
}

func NewProductService(repo repository.ProductRepository) *ProductService {
	return &ProductService{repo: repo}
}

func (s *ProductService) GetAll(ctx context.Context, category string) ([]model.Product, error) {
	if category != "" {
		if !isValidCategory(category) {
			return nil, ErrInvalidCategory
		}
		return s.repo.GetByCategory(ctx, category)
	}
	return s.repo.GetAll(ctx)
}

func (s *ProductService) GetByID(ctx context.Context, id int64) (*model.Product, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrProductNotFound
	}
	return p, nil
}

func (s *ProductService) Create(ctx context.Context, product *model.Product) (int64, error) {
	if err := validateProduct(product); err != nil {
		return 0, err
	}
	return s.repo.Create(ctx, product)
}

func (s *ProductService) Update(ctx context.Context, product *model.Product) error {
	if err := validateProduct(product); err != nil {
		return err
	}
	_, err := s.repo.GetByID(ctx, product.ID)
	if err != nil {
		return ErrProductNotFound
	}
	return s.repo.Update(ctx, product)
}

func (s *ProductService) Delete(ctx context.Context, id int64) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrProductNotFound
	}
	return s.repo.Delete(ctx, id)
}

func validateProduct(p *model.Product) error {
	if p.Name == "" {
		return ErrEmptyName
	}
	if !isValidCategory(p.Category) {
		return ErrInvalidCategory
	}
	if p.Price <= 0 {
		return ErrInvalidPrice
	}
	return nil
}

func isValidCategory(c string) bool {
	return c == "bowl" || c == "table" || c == "oven" || c == "accessory"
}
