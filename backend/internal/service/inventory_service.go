package service

import (
	"context"
	"errors"

	"ochag-kz/internal/model"
	"ochag-kz/internal/repository"
)

var (
	ErrInventoryNotFound   = errors.New("inventory record not found")
	ErrNegativeStock       = errors.New("stock cannot go below zero")
	ErrInvalidDelta        = errors.New("delta cannot be zero")
)

type InventoryService struct {
	repo repository.InventoryRepository
}

func NewInventoryService(repo repository.InventoryRepository) *InventoryService {
	return &InventoryService{repo: repo}
}

func (s *InventoryService) GetAll(ctx context.Context) ([]model.InventoryItem, error) {
	return s.repo.GetAll(ctx)
}

func (s *InventoryService) GetByProductID(ctx context.Context, productID int64) (*model.InventoryItem, error) {
	item, err := s.repo.GetByProductID(ctx, productID)
	if err != nil {
		return nil, ErrInventoryNotFound
	}
	return item, nil
}

func (s *InventoryService) AdjustStock(ctx context.Context, productID int64, delta int, reason string) error {
	if delta == 0 {
		return ErrInvalidDelta
	}

	// Check current stock to prevent negative
	item, err := s.repo.GetByProductID(ctx, productID)
	if err != nil {
		return ErrInventoryNotFound
	}

	if item.Quantity+delta < 0 {
		return ErrNegativeStock
	}

	return s.repo.AdjustQuantity(ctx, productID, delta, reason)
}

func (s *InventoryService) GetLogs(ctx context.Context, productID int64) ([]model.InventoryLog, error) {
	return s.repo.GetLogs(ctx, productID)
}

func (s *InventoryService) EnsureExists(ctx context.Context, productID int64) error {
	return s.repo.EnsureExists(ctx, productID)
}
