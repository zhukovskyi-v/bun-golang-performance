package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const AccessTokenTTLSeconds = 15 * 60

type AccessTokenClaims struct {
	Sub string `json:"sub"`
	Iat int64  `json:"iat"`
	Exp int64  `json:"exp"`
	Jti string `json:"jti"`
}

type JWTSigner struct {
	secret []byte
}

func NewJWTSigner(secret string) *JWTSigner {
	return &JWTSigner{secret: []byte(secret)}
}

func (s *JWTSigner) Sign(userID string) (token string, exp int64, jti string, err error) {
	iat := time.Now().Unix()
	exp = iat + AccessTokenTTLSeconds
	jti = uuid.NewString()
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID,
		"iat": iat,
		"exp": exp,
		"jti": jti,
	})
	signed, err := t.SignedString(s.secret)
	if err != nil {
		return "", 0, "", fmt.Errorf("sign jwt: %w", err)
	}
	return signed, exp, jti, nil
}

func (s *JWTSigner) Verify(token string) (*AccessTokenClaims, error) {
	parsed, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid claims")
	}

	out := &AccessTokenClaims{}
	if v, ok := claims["sub"].(string); ok {
		out.Sub = v
	}
	if v, ok := claims["iat"].(float64); ok {
		out.Iat = int64(v)
	}
	if v, ok := claims["exp"].(float64); ok {
		out.Exp = int64(v)
	}
	if v, ok := claims["jti"].(string); ok {
		out.Jti = v
	}
	if out.Sub == "" {
		return nil, errors.New("missing sub")
	}
	return out, nil
}
