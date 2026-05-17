package http

import (
	"encoding/json"
	"log"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

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
		entry := map[string]any{
			"level":       "info",
			"msg":         "request",
			"method":      c.Request().Method,
			"path":        c.Request().URL.Path,
			"route":       route,
			"status":      c.Response().Status,
			"duration_ms": time.Since(start).Milliseconds(),
		}
		buf, _ := json.Marshal(entry)
		log.Println(string(buf))
		return err
	}
}
