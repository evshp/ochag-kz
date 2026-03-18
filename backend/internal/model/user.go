package model

import "time"

type User struct {
	ID           int64
	Username     string
	PasswordHash string
	Role         string // admin, manager, viewer
	CreatedAt    time.Time
}
