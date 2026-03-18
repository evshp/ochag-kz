package dto

type SetRecommendationsRequest struct {
	ProductIDs []int64 `json:"product_ids"`
}

type RecommendedIDsResponse struct {
	ProductIDs []int64 `json:"product_ids"`
}

// RecommendationBriefResponse is a compact product card for recommendation display.
type RecommendationBriefResponse struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Price    int    `json:"price"`
	ImageURL string `json:"image_url"`
	Category string `json:"category"`
}
