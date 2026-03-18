package model

import "time"

type ContactRequest struct {
	ID        int64
	Name      string
	Phone     string
	Message   string
	CreatedAt time.Time
}
