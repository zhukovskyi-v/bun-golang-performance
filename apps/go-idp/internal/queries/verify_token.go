package queries

import (
	"context"

	"go-idp/internal/auth"
)

type VerifyTokenInput struct {
	AccessToken string
}

type VerifyTokenOutput struct {
	Valid  bool    `json:"valid"`
	UserID *string `json:"user_id"`
	Exp    *int64  `json:"exp"`
}

type VerifyToken struct {
	signer *auth.JWTSigner
}

func NewVerifyToken(signer *auth.JWTSigner) *VerifyToken {
	return &VerifyToken{signer: signer}
}

func (q *VerifyToken) Handle(_ context.Context, in VerifyTokenInput) *VerifyTokenOutput {
	claims, err := q.signer.Verify(in.AccessToken)
	if err != nil || claims == nil {
		return &VerifyTokenOutput{Valid: false}
	}
	sub := claims.Sub
	exp := claims.Exp
	return &VerifyTokenOutput{Valid: true, UserID: &sub, Exp: &exp}
}
