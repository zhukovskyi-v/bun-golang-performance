package http

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"go-idp/internal/commands"
	"go-idp/internal/domain"
	"go-idp/internal/metrics"
	"go-idp/internal/queries"
)

type RegisterBody struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=256"`
}

type LoginBody struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=1"`
}

type RefreshBody struct {
	RefreshToken string `json:"refresh_token" validate:"required,min=1"`
}

type VerifyBody struct {
	AccessToken string `json:"access_token" validate:"required,min=1"`
}

type Routes struct {
	Register *commands.Register
	Login    *commands.Login
	Refresh  *commands.Refresh
	Verify   *queries.VerifyToken
}

type echoValidator struct{ v *validator.Validate }

func (e *echoValidator) Validate(i interface{}) error { return e.v.Struct(i) }

func Register(e *echo.Echo, r Routes) {
	e.Validator = &echoValidator{v: validator.New()}

	e.GET("/healthz", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})

	e.GET("/metrics", echo.WrapHandler(promhttp.HandlerFor(metrics.Registry, promhttp.HandlerOpts{})))

	e.POST("/auth/register", func(c echo.Context) error {
		body := new(RegisterBody)
		if err := bind(c, body); err != nil {
			return err
		}
		out, err := r.Register.Handle(c.Request().Context(), commands.RegisterInput{Email: body.Email, Password: body.Password})
		if err != nil {
			return err
		}
		return c.JSON(http.StatusCreated, out)
	})

	e.POST("/auth/login", func(c echo.Context) error {
		body := new(LoginBody)
		if err := bind(c, body); err != nil {
			return err
		}
		out, err := r.Login.Handle(c.Request().Context(), commands.LoginInput{Email: body.Email, Password: body.Password})
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, out)
	})

	e.POST("/auth/refresh", func(c echo.Context) error {
		body := new(RefreshBody)
		if err := bind(c, body); err != nil {
			return err
		}
		out, err := r.Refresh.Handle(c.Request().Context(), commands.RefreshInput{RefreshToken: body.RefreshToken})
		if err != nil {
			return err
		}
		return c.JSON(http.StatusOK, out)
	})

	e.POST("/auth/verify", func(c echo.Context) error {
		body := new(VerifyBody)
		if err := bind(c, body); err != nil {
			return err
		}
		out := r.Verify.Handle(c.Request().Context(), queries.VerifyTokenInput{AccessToken: body.AccessToken})
		return c.JSON(http.StatusOK, out)
	})
}

func bind(c echo.Context, dst any) error {
	if err := c.Bind(dst); err != nil {
		logBindFailure(c, "bind", err)
		return domain.ValidationFailed()
	}
	if err := c.Validate(dst); err != nil {
		logBindFailure(c, "validate", err)
		return domain.ValidationFailed()
	}
	return nil
}

func logBindFailure(c echo.Context, stage string, err error) {
	entry := map[string]any{
		"level":  "warn",
		"msg":    "request_bind_failed",
		"stage":  stage,
		"method": c.Request().Method,
		"path":   c.Request().URL.Path,
		"err":    err.Error(),
	}
	buf, _ := json.Marshal(entry)
	log.Println(string(buf))
}

type ErrorBody struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func ErrorHandler() echo.HTTPErrorHandler {
	return func(err error, c echo.Context) {
		if c.Response().Committed {
			return
		}
		method := c.Request().Method
		path := c.Request().URL.Path
		route := c.Path()

		var de *domain.Error
		if errors.As(err, &de) {
			logHandlerError("warn", "domain_error", method, path, route, de.Status, de.Code, err)
			_ = c.JSON(de.Status, ErrorBody{Error: de.Message, Code: de.Code})
			return
		}
		var he *echo.HTTPError
		if errors.As(err, &he) && he.Code == http.StatusBadRequest {
			logHandlerError("warn", "echo_bad_request", method, path, route, http.StatusBadRequest, "validation_failed", err)
			_ = c.JSON(http.StatusBadRequest, ErrorBody{Error: "validation_failed", Code: "validation_failed"})
			return
		}
		if errors.As(err, &he) {
			logHandlerError("warn", "echo_http_error", method, path, route, he.Code, "", err)
			_ = c.JSON(he.Code, ErrorBody{Error: http.StatusText(he.Code), Code: "http_error"})
			return
		}
		logHandlerError("error", "unhandled", method, path, route, http.StatusInternalServerError, "internal_error", err)
		_ = c.JSON(http.StatusInternalServerError, ErrorBody{Error: "internal_error", Code: "internal_error"})
	}
}

func logHandlerError(level, msg, method, path, route string, status int, code string, err error) {
	entry := map[string]any{
		"level":  level,
		"msg":    msg,
		"method": method,
		"path":   path,
		"route":  route,
		"status": status,
		"err":    err.Error(),
	}
	if code != "" {
		entry["code"] = code
	}
	buf, _ := json.Marshal(entry)
	log.Println(string(buf))
}
