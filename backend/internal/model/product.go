package model

type Spec struct {
	Label string
	Value string
}

type ProductOption struct {
	Name  string
	Price int
}

type Product struct {
	ID            int64
	Name          string
	Category      string // bowl, table, oven
	Badge         string
	Price         int
	ImageURL      string
	StockQuantity int
	Specs         []Spec
	Options       []ProductOption
}
