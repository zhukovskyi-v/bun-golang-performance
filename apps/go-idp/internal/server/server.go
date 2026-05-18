package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	stdlog "log"
	stdhttp "net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho"
	"gorm.io/gorm"

	"go-idp/internal/auth"
	"go-idp/internal/commands"
	httpx "go-idp/internal/http"
	otelinit "go-idp/internal/otel"
	"go-idp/internal/queries"
	"go-idp/internal/repositories"
)

type Server struct {
	echo     *echo.Echo
	port     int
	shutdown otelinit.Shutdown
}

func New(db *gorm.DB, signer *auth.JWTSigner, port int, otelShutdown otelinit.Shutdown) *Server {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true
	e.HTTPErrorHandler = httpx.ErrorHandler()

	e.Use(middleware.RequestID())
	e.Use(middleware.RecoverWithConfig(middleware.RecoverConfig{
		StackSize:         4 << 10,
		DisablePrintStack: true,
		LogErrorFunc: func(c echo.Context, err error, stack []byte) error {
			entry := map[string]any{
				"level":      "error",
				"msg":        "panic",
				"method":     c.Request().Method,
				"path":       c.Request().URL.Path,
				"err":        err.Error(),
				"stack":      string(stack),
				"request_id": c.Response().Header().Get(echo.HeaderXRequestID),
			}
			buf, _ := json.Marshal(entry)
			stdlog.Println(string(buf))
			return err
		},
	}))
	e.Use(otelecho.Middleware(otelinit.ServiceName))
	e.Use(httpx.MetricsMiddleware)
	e.Use(httpx.RequestLogger)

	users := repositories.NewUsersRepository(db)
	sessions := repositories.NewSessionsRepository(db)

	httpx.Register(e, httpx.Routes{
		Register: commands.NewRegister(users),
		Login:    commands.NewLogin(users, sessions, signer),
		Refresh:  commands.NewRefresh(sessions, signer),
		Verify:   queries.NewVerifyToken(signer),
	})

	return &Server{echo: e, port: port, shutdown: otelShutdown}
}

func (s *Server) Run() error {
	s.echo.Server.ReadTimeout = 15 * time.Second
	s.echo.Server.ReadHeaderTimeout = 5 * time.Second
	s.echo.Server.WriteTimeout = 30 * time.Second
	s.echo.Server.IdleTimeout = 60 * time.Second
	s.echo.Server.MaxHeaderBytes = 1 << 14

	errCh := make(chan error, 1)
	go func() {
		addr := ":" + strconv.Itoa(s.port)
		fmt.Printf(`{"level":"info","msg":"listening","port":%d}`+"\n", s.port)
		if err := s.echo.Start(addr); err != nil && !errors.Is(err, stdhttp.ErrServerClosed) {
			errCh <- err
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)

	select {
	case err := <-errCh:
		return err
	case sig := <-sigCh:
		fmt.Printf(`{"level":"info","msg":"shutdown","signal":%q}`+"\n", sig.String())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := s.echo.Shutdown(ctx); err != nil {
		return fmt.Errorf("echo shutdown: %w", err)
	}
	if s.shutdown != nil {
		if err := s.shutdown(ctx); err != nil {
			fmt.Printf(`{"level":"error","msg":"otel shutdown","err":%q}`+"\n", err.Error())
		}
	}
	return nil
}
