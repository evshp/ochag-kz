package postgres

import (
	"context"
	"fmt"

	"ochag-kz/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ContactRepo struct {
	pool *pgxpool.Pool
}

func NewContactRepo(pool *pgxpool.Pool) *ContactRepo {
	return &ContactRepo{pool: pool}
}

func (r *ContactRepo) Create(ctx context.Context, req *model.ContactRequest) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx,
		"INSERT INTO contact_requests (name, phone, message) VALUES ($1, $2, $3) RETURNING id",
		req.Name, req.Phone, req.Message,
	).Scan(&id)
	if err != nil {
		return 0, fmt.Errorf("insert contact request: %w", err)
	}
	return id, nil
}

func (r *ContactRepo) GetAll(ctx context.Context) ([]model.ContactRequest, error) {
	rows, err := r.pool.Query(ctx, "SELECT id, name, phone, message, created_at FROM contact_requests ORDER BY created_at DESC")
	if err != nil {
		return nil, fmt.Errorf("query contact requests: %w", err)
	}
	defer rows.Close()

	var requests []model.ContactRequest
	for rows.Next() {
		var cr model.ContactRequest
		if err := rows.Scan(&cr.ID, &cr.Name, &cr.Phone, &cr.Message, &cr.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan contact request: %w", err)
		}
		requests = append(requests, cr)
	}
	return requests, nil
}
