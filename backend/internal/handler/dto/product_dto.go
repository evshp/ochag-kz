package dto

import (
	"errors"

	"ochag-kz/internal/model"
)

const (
	maxNameLen        = 200
	maxDescriptionLen = 5000
	maxBadgeLen       = 100
	maxImageURLLen    = 2048
	maxSpecLabelLen   = 100
	maxSpecValueLen   = 200
	maxOptionNameLen  = 200
)

type SpecDTO struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type ProductOptionDTO struct {
	Name  string `json:"name"`
	Price int    `json:"price"`
}

type ProductResponse struct {
	ID              int64                        `json:"id"`
	Name            string                       `json:"name"`
	Description     string                       `json:"description"`
	Category        string                       `json:"category"`
	Badge           string                       `json:"badge"`
	Price           int                          `json:"price"`
	ImageURL        string                       `json:"image_url"`
	StockQuantity   int                          `json:"stock_quantity"`
	Specs           []SpecDTO                    `json:"specs"`
	Options         []ProductOptionDTO           `json:"options"`
	Recommendations []RecommendationBriefResponse `json:"recommendations,omitempty"`
}

type CreateProductRequest struct {
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Category    string             `json:"category"`
	Badge       string             `json:"badge"`
	Price       int                `json:"price"`
	ImageURL    string             `json:"image_url"`
	Specs       []SpecDTO          `json:"specs"`
	Options     []ProductOptionDTO `json:"options"`
}

type UpdateProductRequest struct {
	Name        string             `json:"name"`
	Description string             `json:"description"`
	Category    string             `json:"category"`
	Badge       string             `json:"badge"`
	Price       int                `json:"price"`
	ImageURL    string             `json:"image_url"`
	Specs       []SpecDTO          `json:"specs"`
	Options     []ProductOptionDTO `json:"options"`
}

func validateProductFields(name, description, badge, imageURL string, specs []SpecDTO, options []ProductOptionDTO) error {
	if len(name) > maxNameLen {
		return errors.New("name too long (max 200)")
	}
	if len(description) > maxDescriptionLen {
		return errors.New("description too long (max 5000)")
	}
	if len(badge) > maxBadgeLen {
		return errors.New("badge too long (max 100)")
	}
	if len(imageURL) > maxImageURLLen {
		return errors.New("image_url too long (max 2048)")
	}
	for _, s := range specs {
		if len(s.Label) > maxSpecLabelLen || len(s.Value) > maxSpecValueLen {
			return errors.New("spec label/value too long")
		}
	}
	for _, o := range options {
		if len(o.Name) > maxOptionNameLen {
			return errors.New("option name too long")
		}
	}
	return nil
}

func (r *CreateProductRequest) Validate() error {
	return validateProductFields(r.Name, r.Description, r.Badge, r.ImageURL, r.Specs, r.Options)
}

func (r *UpdateProductRequest) Validate() error {
	return validateProductFields(r.Name, r.Description, r.Badge, r.ImageURL, r.Specs, r.Options)
}

// ToModel converts CreateProductRequest DTO to domain model.
func (r *CreateProductRequest) ToModel() *model.Product {
	p := &model.Product{
		Name:        r.Name,
		Description: r.Description,
		Category:    r.Category,
		Badge:       r.Badge,
		Price:       r.Price,
		ImageURL:    r.ImageURL,
	}
	for _, s := range r.Specs {
		p.Specs = append(p.Specs, model.Spec{Label: s.Label, Value: s.Value})
	}
	for _, o := range r.Options {
		p.Options = append(p.Options, model.ProductOption{Name: o.Name, Price: o.Price})
	}
	return p
}

// ToModel converts UpdateProductRequest DTO to domain model with given ID.
func (r *UpdateProductRequest) ToModel(id int64) *model.Product {
	p := &model.Product{
		ID:          id,
		Name:        r.Name,
		Description: r.Description,
		Category:    r.Category,
		Badge:       r.Badge,
		Price:       r.Price,
		ImageURL:    r.ImageURL,
	}
	for _, s := range r.Specs {
		p.Specs = append(p.Specs, model.Spec{Label: s.Label, Value: s.Value})
	}
	for _, o := range r.Options {
		p.Options = append(p.Options, model.ProductOption{Name: o.Name, Price: o.Price})
	}
	return p
}

// ProductFromModel converts domain model to response DTO.
func ProductFromModel(p *model.Product) ProductResponse {
	specs := make([]SpecDTO, 0, len(p.Specs))
	for _, s := range p.Specs {
		specs = append(specs, SpecDTO{Label: s.Label, Value: s.Value})
	}
	options := make([]ProductOptionDTO, 0, len(p.Options))
	for _, o := range p.Options {
		options = append(options, ProductOptionDTO{Name: o.Name, Price: o.Price})
	}
	return ProductResponse{
		ID:            p.ID,
		Name:          p.Name,
		Description:   p.Description,
		Category:      p.Category,
		Badge:         p.Badge,
		Price:         p.Price,
		ImageURL:      p.ImageURL,
		StockQuantity: p.StockQuantity,
		Specs:         specs,
		Options:       options,
	}
}

// ProductsFromModel converts a slice of domain models to response DTOs.
func ProductsFromModel(products []model.Product) []ProductResponse {
	result := make([]ProductResponse, 0, len(products))
	for i := range products {
		result = append(result, ProductFromModel(&products[i]))
	}
	return result
}

// RecommendationBriefsFromModel converts products to brief recommendation DTOs.
func RecommendationBriefsFromModel(products []model.Product) []RecommendationBriefResponse {
	result := make([]RecommendationBriefResponse, 0, len(products))
	for _, p := range products {
		result = append(result, RecommendationBriefResponse{
			ID:       p.ID,
			Name:     p.Name,
			Price:    p.Price,
			ImageURL: p.ImageURL,
			Category: p.Category,
		})
	}
	return result
}

// AttachRecommendations adds recommendation data to product responses using a preloaded map.
func AttachRecommendations(responses []ProductResponse, recsMap map[int64][]model.Product) {
	for i := range responses {
		if recs, ok := recsMap[responses[i].ID]; ok {
			responses[i].Recommendations = RecommendationBriefsFromModel(recs)
		}
	}
}
