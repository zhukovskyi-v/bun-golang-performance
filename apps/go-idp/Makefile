.PHONY: build run test docker tidy

build:
	go build -trimpath -ldflags="-s -w" -o bin/server ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./...

tidy:
	go mod tidy

docker:
	docker build -t go-idp .
