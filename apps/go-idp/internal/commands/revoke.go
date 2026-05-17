package commands

import (
	"context"

	"go-idp/internal/repositories"
)

type Revoke struct {
	sessions *repositories.SessionsRepository
}

func NewRevoke(sessions *repositories.SessionsRepository) *Revoke {
	return &Revoke{sessions: sessions}
}

func (c *Revoke) Handle(ctx context.Context, sessionID string) error {
	return c.sessions.Revoke(ctx, sessionID)
}
