package commands

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/sync/errgroup"

	"go-idp/internal/auth"
	"go-idp/internal/domain"
	"go-idp/internal/repositories"
)

type RegisterInput struct {
	Email    string
	Password string
}

type RegisterOutput struct {
	UserID string `json:"user_id"`
}

type Register struct {
	users *repositories.UsersRepository
}

func NewRegister(users *repositories.UsersRepository) *Register {
	return &Register{users: users}
}

func (c *Register) Handle(ctx context.Context, in RegisterInput) (*RegisterOutput, error) {
	var (
		existed   bool
		encrypted string
	)

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		u, err := c.users.FindByEmail(gctx, in.Email)
		if err != nil {
			return err
		}
		existed = u != nil
		return nil
	})
	g.Go(func() error {
		h, err := auth.HashPassword(in.Password)
		if err != nil {
			return err
		}
		encrypted = h
		return nil
	})
	if err := g.Wait(); err != nil {
		return nil, err
	}

	if existed {
		return nil, domain.UserExists()
	}

	u, err := c.users.Insert(ctx, in.Email, encrypted)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, domain.UserExists()
		}
		return nil, err
	}
	return &RegisterOutput{UserID: u.ID}, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
