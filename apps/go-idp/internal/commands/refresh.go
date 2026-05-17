package commands

import (
	"context"
	"time"

	"go-idp/internal/auth"
	"go-idp/internal/domain"
	"go-idp/internal/repositories"
)

type RefreshInput struct {
	RefreshToken string
}

type RefreshOutput struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Refresh struct {
	sessions *repositories.SessionsRepository
	signer   *auth.JWTSigner
}

func NewRefresh(sessions *repositories.SessionsRepository, signer *auth.JWTSigner) *Refresh {
	return &Refresh{sessions: sessions, signer: signer}
}

func (c *Refresh) Handle(ctx context.Context, in RefreshInput) (*RefreshOutput, error) {
	hash := auth.HashRefreshToken(in.RefreshToken)
	session, err := c.sessions.FindActiveByHash(ctx, hash)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, domain.InvalidToken()
	}

	if err := c.sessions.Revoke(ctx, session.ID); err != nil {
		return nil, err
	}

	access, _, _, err := c.signer.Sign(session.UserID)
	if err != nil {
		return nil, err
	}

	newRefresh, newHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}
	expiresAt := time.Now().Add(time.Duration(auth.RefreshTokenTTLSeconds) * time.Second)
	if _, err := c.sessions.Insert(ctx, session.UserID, newHash, expiresAt); err != nil {
		return nil, err
	}

	return &RefreshOutput{
		AccessToken:  access,
		RefreshToken: newRefresh,
		ExpiresIn:    auth.AccessTokenTTLSeconds,
	}, nil
}
