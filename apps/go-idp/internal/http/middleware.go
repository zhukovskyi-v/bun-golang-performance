package http

import (
	"encoding/json"
	"errors"
	"log"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	"go-idp/internal/domain"
	"go-idp/internal/metrics"
)

func MetricsMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		start := time.Now()
		err := next(c)
		elapsed := time.Since(start).Seconds()
		route := c.Path()
		if route == "" {
			route = "unknown"
		}
		labels := map[string]string{
			"method": c.Request().Method,
			"route":  route,
			"status": strconv.Itoa(c.Response().Status),
		}
		metrics.HTTPRequestsTotal.With(labels).Inc()
		metrics.HTTPRequestDurationSeconds.With(labels).Observe(elapsed)
		return err
	}
}

func RequestLogger(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		start := time.Now()
		err := next(c)
		route := c.Path()
		if route == "" {
			route = "unknown"
		}
		status := c.Response().Status
		entry := map[string]any{
			"level":       levelFor(status, err),
			"msg":         "request",
			"method":      c.Request().Method,
			"path":        c.Request().URL.Path,
			"route":       route,
			"status":      status,
			"duration_ms": time.Since(start).Milliseconds(),
			"remote_ip":   c.RealIP(),
		}
		if reqID := c.Response().Header().Get(echo.HeaderXRequestID); reqID != "" {
			entry["request_id"] = reqID
		}
		if err != nil {
			entry["err"] = err.Error()
			var de *domain.Error
			if errors.As(err, &de) {
				entry["code"] = de.Code
			}
		}
		buf, _ := json.Marshal(entry)
		log.Println(string(buf))
		return err
	}
}

func levelFor(status int, err error) string {
	switch {
	case status >= 500:
		return "error"
	case status >= 400 || err != nil:
		return "warn"
	default:
		return "info"
	}
}