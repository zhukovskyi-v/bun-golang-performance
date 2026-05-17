package repositories

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"go-idp/internal/database"
)

type UsersRepository struct {
	db *gorm.DB
}

func NewUsersRepository(db *gorm.DB) *UsersRepository {
	return &UsersRepository{db: db}
}

func (r *UsersRepository) Insert(ctx context.Context, email, encryptedPassword string) (*database.User, error) {
	u := &database.User{Email: email, EncryptedPassword: encryptedPassword}
	if err := r.db.WithContext(ctx).Create(u).Error; err != nil {
		return nil, err
	}
	return u, nil
}

func (r *UsersRepository) FindByEmail(ctx context.Context, email string) (*database.User, error) {
	var u database.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UsersRepository) FindByID(ctx context.Context, id string) (*database.User, error) {
	var u database.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}
