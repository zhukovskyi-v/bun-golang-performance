package queries

import (
	"context"

	"go-idp/internal/repositories"
)

type PublicUser struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type GetUser struct {
	users *repositories.UsersRepository
}

func NewGetUser(users *repositories.UsersRepository) *GetUser {
	return &GetUser{users: users}
}

func (q *GetUser) Handle(ctx context.Context, id string) (*PublicUser, error) {
	u, err := q.users.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, nil
	}
	return &PublicUser{
		ID:        u.ID,
		Email:     u.Email,
		CreatedAt: u.CreatedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
		UpdatedAt: u.UpdatedAt.UTC().Format("2006-01-02T15:04:05.000Z"),
	}, nil
}
