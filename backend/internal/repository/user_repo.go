package repository

import (
	"context"
	"ochag-kz/internal/model"
)

type UserRepository interface {
	GetByUsername(ctx context.Context, username string) (*model.User, error)
	GetAll(ctx context.Context) ([]model.User, error)
	Create(ctx context.Context, user *model.User) (int64, error)
	UpdateRole(ctx context.Context, id int64, role string) error
	Delete(ctx context.Context, id int64) error
}
