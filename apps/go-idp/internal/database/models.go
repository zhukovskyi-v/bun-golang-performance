package database

import "time"

type User struct {
	ID                string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email             string    `gorm:"type:citext;not null;uniqueIndex:users_email_unique"`
	EncryptedPassword string    `gorm:"type:text;not null"`
	CreatedAt         time.Time `gorm:"type:timestamptz;not null;default:now()"`
	UpdatedAt         time.Time `gorm:"type:timestamptz;not null;default:now()"`
}

func (User) TableName() string { return "users" }

type Session struct {
	ID               string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID           string     `gorm:"type:uuid;not null;index:sessions_user_id_idx"`
	RefreshTokenHash string     `gorm:"type:text;not null;index:sessions_refresh_token_hash_idx"`
	ExpiresAt        time.Time  `gorm:"type:timestamptz;not null"`
	RevokedAt        *time.Time `gorm:"type:timestamptz"`
	CreatedAt        time.Time  `gorm:"type:timestamptz;not null;default:now()"`
	User             User       `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:CASCADE"`
}

func (Session) TableName() string { return "sessions" }
