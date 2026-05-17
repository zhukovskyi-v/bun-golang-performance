package commands

import (
	"context"
	"time"

	"go-idp/internal/auth"
	"go-idp/internal/domain"
	"go-idp/internal/repositories"
)

type LoginInput struct {
	Email    string
	Password string
}

type LoginOutput struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Login struct {
	users    *repositories.UsersRepository
	sessions *repositories.SessionsRepository
	signer   *auth.JWTSigner
}

func NewLogin(users *repositories.UsersRepository, sessions *repositories.SessionsRepository, signer *auth.JWTSigner) *Login {
	return &Login{users: users, sessions: sessions, signer: signer}
}

func (c *Login) Handle(ctx context.Context, in LoginInput) (*LoginOutput, error) {
	u, err := c.users.FindByEmail(ctx, in.Email)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, domain.InvalidCredentials()
	}

	ok, err := auth.VerifyPassword(u.EncryptedPassword, in.Password)
	if err != nil || !ok {
		return nil, domain.InvalidCredentials()
	}

	access, _, _, err := c.signer.Sign(u.ID)
	if err != nil {
		return nil, err
	}

	refresh, hash, err := auth.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().Add(time.Duration(auth.RefreshTokenTTLSeconds) * time.Second)
	if _, err := c.sessions.Insert(ctx, u.ID, hash, expiresAt); err != nil {
		return nil, err
	}

	return &LoginOutput{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    auth.AccessTokenTTLSeconds,
	}, nil
}
