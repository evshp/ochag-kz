package service

import (
	"context"
	"errors"
	"time"

	"ochag-kz/internal/model"
	"ochag-kz/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrUserExists         = errors.New("user already exists")
	ErrInvalidRole        = errors.New("invalid role: must be admin, manager, or viewer")
	ErrEmptyUsername      = errors.New("username is required")
	ErrEmptyPassword      = errors.New("password is required")
	ErrShortUsername      = errors.New("username must be at least 3 characters")
	ErrCannotDeleteSelf   = errors.New("cannot delete yourself")
)

type AuthService struct {
	userRepo  repository.UserRepository
	jwtSecret []byte
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:  userRepo,
		jwtSecret: []byte(jwtSecret),
	}
}

func (s *AuthService) Login(ctx context.Context, username, password string) (string, error) {
	user, err := s.userRepo.GetByUsername(ctx, username)
	if err != nil {
		return "", ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", ErrInvalidCredentials
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func (s *AuthService) ValidateToken(tokenString string) (int64, string, string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return 0, "", "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return 0, "", "", errors.New("invalid token")
	}

	userIDFloat, ok := claims["user_id"].(float64)
	if !ok {
		return 0, "", "", errors.New("invalid token: missing user_id")
	}
	username, ok := claims["username"].(string)
	if !ok {
		return 0, "", "", errors.New("invalid token: missing username")
	}
	role, ok := claims["role"].(string)
	if !ok {
		return 0, "", "", errors.New("invalid token: missing role")
	}

	return int64(userIDFloat), username, role, nil
}

func (s *AuthService) GetAllUsers(ctx context.Context) ([]model.User, error) {
	return s.userRepo.GetAll(ctx)
}

func (s *AuthService) CreateUser(ctx context.Context, username, password, role string) (int64, error) {
	if username == "" {
		return 0, ErrEmptyUsername
	}
	if len(username) < 3 {
		return 0, ErrShortUsername
	}
	if password == "" {
		return 0, ErrEmptyPassword
	}
	if !isValidRole(role) {
		return 0, ErrInvalidRole
	}

	existing, _ := s.userRepo.GetByUsername(ctx, username)
	if existing != nil {
		return 0, ErrUserExists
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}

	user := &model.User{
		Username:     username,
		PasswordHash: string(hash),
		Role:         role,
	}

	return s.userRepo.Create(ctx, user)
}

func (s *AuthService) UpdateUserRole(ctx context.Context, id int64, role string) error {
	if !isValidRole(role) {
		return ErrInvalidRole
	}
	return s.userRepo.UpdateRole(ctx, id, role)
}

func (s *AuthService) DeleteUser(ctx context.Context, id int64, currentUserID int64) error {
	if id == currentUserID {
		return ErrCannotDeleteSelf
	}
	return s.userRepo.Delete(ctx, id)
}

func isValidRole(r string) bool {
	return r == "admin" || r == "manager" || r == "viewer"
}
