package repositories

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"go-idp/internal/database"
)

type SessionsRepository struct {
	db *gorm.DB
}

func NewSessionsRepository(db *gorm.DB) *SessionsRepository {
	return &SessionsRepository{db: db}
}

func (r *SessionsRepository) Insert(ctx context.Context, userID, refreshTokenHash string, expiresAt time.Time) (*database.Session, error) {
	s := &database.Session{
		UserID:           userID,
		RefreshTokenHash: refreshTokenHash,
		ExpiresAt:        expiresAt,
	}
	if err := r.db.WithContext(ctx).Create(s).Error; err != nil {
		return nil, err
	}
	return s, nil
}

func (r *SessionsRepository) FindActiveByHash(ctx context.Context, refreshTokenHash string) (*database.Session, error) {
	var s database.Session
	err := r.db.WithContext(ctx).
		Where("refresh_token_hash = ? AND revoked_at IS NULL AND expires_at > now()", refreshTokenHash).
		First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

func (r *SessionsRepository) Revoke(ctx context.Context, id string) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&database.Session{}).
		Where("id = ?", id).
		Update("revoked_at", now).Error
}
