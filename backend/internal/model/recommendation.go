package model

type Recommendation struct {
	ID                   int64
	ProductID            int64
	RecommendedProductID int64
	SortOrder            int
}
