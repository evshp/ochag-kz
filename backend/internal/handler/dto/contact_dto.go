package dto

type ContactFormRequest struct {
	Name    string `json:"name"`
	Phone   string `json:"phone"`
	Message string `json:"message"`
}

type ContactFormResponse struct {
	OK      bool   `json:"ok"`
	Message string `json:"message"`
}
