package service

import (
	"context"
	"errors"

	"ochag-kz/internal/model"
	"ochag-kz/internal/repository"
)

var (
	ErrEmptyContactName  = errors.New("name is required")
	ErrEmptyContactPhone = errors.New("phone is required")
)

type ContactService struct {
	repo repository.ContactRepository
}

func NewContactService(repo repository.ContactRepository) *ContactService {
	return &ContactService{repo: repo}
}

func (s *ContactService) Create(ctx context.Context, name, phone, message string) (int64, error) {
	if name == "" {
		return 0, ErrEmptyContactName
	}
	if phone == "" {
		return 0, ErrEmptyContactPhone
	}

	req := &model.ContactRequest{
		Name:    name,
		Phone:   phone,
		Message: message,
	}
	return s.repo.Create(ctx, req)
}

func (s *ContactService) GetAll(ctx context.Context) ([]model.ContactRequest, error) {
	return s.repo.GetAll(ctx)
}
