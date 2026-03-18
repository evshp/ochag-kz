package dto

import "ochag-kz/internal/model"

type SpecDTO struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type ProductOptionDTO struct {
	Name  string `json:"name"`
	Price int    `json:"price"`
}

type ProductResponse struct {
	ID       int64              `json:"id"`
	Name     string             `json:"name"`
	Category string             `json:"category"`
	Badge    string             `json:"badge"`
	Price    int                `json:"price"`
	Specs    []SpecDTO          `json:"specs"`
	Options  []ProductOptionDTO `json:"options"`
}

type CreateProductRequest struct {
	Name     string             `json:"name"`
	Category string             `json:"category"`
	Badge    string             `json:"badge"`
	Price    int                `json:"price"`
	Specs    []SpecDTO          `json:"specs"`
	Options  []ProductOptionDTO `json:"options"`
}

type UpdateProductRequest struct {
	Name     string             `json:"name"`
	Category string             `json:"category"`
	Badge    string             `json:"badge"`
	Price    int                `json:"price"`
	Specs    []SpecDTO          `json:"specs"`
	Options  []ProductOptionDTO `json:"options"`
}

// ToModel converts CreateProductRequest DTO to domain model.
func (r *CreateProductRequest) ToModel() *model.Product {
	p := &model.Product{
		Name:     r.Name,
		Category: r.Category,
		Badge:    r.Badge,
		Price:    r.Price,
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
		ID:       id,
		Name:     r.Name,
		Category: r.Category,
		Badge:    r.Badge,
		Price:    r.Price,
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
		ID:       p.ID,
		Name:     p.Name,
		Category: p.Category,
		Badge:    p.Badge,
		Price:    p.Price,
		Specs:    specs,
		Options:  options,
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
