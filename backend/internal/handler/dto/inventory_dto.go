package dto

import (
	"ochag-kz/internal/model"
	"time"
)

type InventoryResponse struct {
	ProductID   int64  `json:"product_id"`
	ProductName string `json:"product_name"`
	Category    string `json:"category"`
	Quantity    int    `json:"quantity"`
	UpdatedAt   string `json:"updated_at"`
}

type AdjustStockRequest struct {
	Delta  int    `json:"delta"`
	Reason string `json:"reason"`
}

type InventoryLogResponse struct {
	ID        int64  `json:"id"`
	ProductID int64  `json:"product_id"`
	Delta     int    `json:"delta"`
	Reason    string `json:"reason"`
	CreatedAt string `json:"created_at"`
}

func InventoryLogFromModel(l *model.InventoryLog) InventoryLogResponse {
	return InventoryLogResponse{
		ID:        l.ID,
		ProductID: l.ProductID,
		Delta:     l.Delta,
		Reason:    l.Reason,
		CreatedAt: l.CreatedAt.Format(time.RFC3339),
	}
}

func InventoryLogsFromModel(logs []model.InventoryLog) []InventoryLogResponse {
	result := make([]InventoryLogResponse, 0, len(logs))
	for i := range logs {
		result = append(result, InventoryLogFromModel(&logs[i]))
	}
	return result
}
