package domain

import "net/http"

type Error struct {
	Code    string
	Status  int
	Message string
}

func (e *Error) Error() string { return e.Message }

func InvalidCredentials() *Error {
	return &Error{Code: "invalid_credentials", Status: http.StatusUnauthorized, Message: "invalid credentials"}
}

func UserExists() *Error {
	return &Error{Code: "user_exists", Status: http.StatusConflict, Message: "user already exists"}
}

func InvalidToken() *Error {
	return &Error{Code: "invalid_token", Status: http.StatusUnauthorized, Message: "invalid token"}
}

func ValidationFailed() *Error {
	return &Error{Code: "validation_failed", Status: http.StatusBadRequest, Message: "validation_failed"}
}
