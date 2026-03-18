package postgres

import (
	"context"
	"fmt"

	"ochag-kz/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

func (r *UserRepo) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	var u model.User
	err := r.pool.QueryRow(ctx,
		"SELECT id, username, password_hash, role, created_at FROM users WHERE username = $1",
		username,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("query user by username: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) GetAll(ctx context.Context) ([]model.User, error) {
	rows, err := r.pool.Query(ctx, "SELECT id, username, password_hash, role, created_at FROM users ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		users = append(users, u)
	}
	return users, nil
}

func (r *UserRepo) Create(ctx context.Context, user *model.User) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx,
		"INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
		user.Username, user.PasswordHash, user.Role,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert user: %w", err)
	}
	return id, nil
}

func (r *UserRepo) UpdateRole(ctx context.Context, id int64, role string) error {
	_, err := r.pool.Exec(ctx, "UPDATE users SET role = $1 WHERE id = $2", role, id)
	if err != nil {
		return fmt.Errorf("update user role: %w", err)
	}
	return nil
}

func (r *UserRepo) Delete(ctx context.Context, id int64) error {
	_, err := r.pool.Exec(ctx, "DELETE FROM users WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return nil
}
