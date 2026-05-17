package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
)

const RefreshTokenTTLSeconds = 30 * 24 * 60 * 60

func GenerateRefreshToken() (token, hash string, err error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", "", fmt.Errorf("rand refresh: %w", err)
	}
	token = base64.RawURLEncoding.EncodeToString(raw)
	hash = HashRefreshToken(token)
	return token, hash, nil
}

func HashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
