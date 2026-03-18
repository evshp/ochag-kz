package repository

import (
	"context"
	"ochag-kz/internal/model"
)

type ContactRepository interface {
	Create(ctx context.Context, req *model.ContactRequest) (int64, error)
	GetAll(ctx context.Context) ([]model.ContactRequest, error)
}
