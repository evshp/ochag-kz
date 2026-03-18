package model

import "time"

type InventoryItem struct {
	ID        int64
	ProductID int64
	Quantity  int
	UpdatedAt time.Time
}

type InventoryLog struct {
	ID        int64
	ProductID int64
	Delta     int
	Reason    string
	CreatedAt time.Time
}
