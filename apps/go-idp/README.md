# go-idp

Go identity provider. Counterpart to `apps/hono-idp`.

## Stack

Go + Echo + GORM (pgx) + Neon Postgres + golang-jwt/v5 + argon2id + OpenTelemetry + Prometheus.

## Run

```
cp .env.example .env   # fill in DATABASE_URL + JWT_SECRET
make run
```

## Build

```
make build      # local binary -> bin/server
make docker     # distroless image -> go-idp
```

## Endpoints

| Method | Path             | Purpose                       |
|--------|------------------|-------------------------------|
| POST   | /auth/register   | create user                   |
| POST   | /auth/login      | issue access + refresh tokens |
| POST   | /auth/refresh    | rotate refresh, mint access   |
| POST   | /auth/verify     | verify access token (JWT)     |
| GET    | /healthz         | liveness                      |
| GET    | /metrics         | Prometheus exposition         |
