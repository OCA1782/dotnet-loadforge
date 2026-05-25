package http

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	nethttp "net/http"
	"strings"
	"time"

	"github.com/loadforge/engine/core"
	"github.com/loadforge/engine/internal/clock"
)

// Runner executes HTTP steps.
type Runner struct {
	client  *nethttp.Client
	baseURL string
	headers map[string]string
}

func NewRunner(baseURL string, globalHeaders map[string]string) *Runner {
	transport := &nethttp.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	}
	return &Runner{
		client:  &nethttp.Client{Transport: transport},
		baseURL: strings.TrimRight(baseURL, "/"),
		headers: globalHeaders,
	}
}

// Execute runs a single step and returns a RequestResult.
func (r *Runner) Execute(ctx context.Context, step core.Step) core.RequestResult {
	url := r.resolveURL(step.Request.URL)
	body, bytesOut := r.buildBody(step.Request.Body)

	timeoutMs := step.Request.TimeoutMs
	if timeoutMs <= 0 {
		timeoutMs = 30_000
	}
	reqCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()

	req, err := nethttp.NewRequestWithContext(reqCtx, step.Request.Method, url, body)
	if err != nil {
		return core.RequestResult{
			StepName:  step.Name,
			Method:    step.Request.Method,
			URL:       url,
			Error:     fmt.Errorf("creating request: %w", err),
			Timestamp: clock.Now(),
		}
	}

	// Merge global then step headers
	for k, v := range r.headers {
		req.Header.Set(k, v)
	}
	for k, v := range step.Request.Headers {
		req.Header.Set(k, v)
	}
	if body != nil && req.Header.Get("Content-Type") == "" {
		req.Header.Set("Content-Type", "application/json")
	}

	start := clock.Now()
	resp, err := r.client.Do(req)
	latencyMs := clock.Since(start)

	if err != nil {
		return core.RequestResult{
			StepName:  step.Name,
			Method:    step.Request.Method,
			URL:       url,
			LatencyMs: latencyMs,
			BytesOut:  bytesOut,
			Error:     err,
			Timestamp: start,
		}
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)

	return core.RequestResult{
		StepName:   step.Name,
		Method:     step.Request.Method,
		URL:        url,
		StatusCode: resp.StatusCode,
		LatencyMs:  latencyMs,
		BytesIn:    int64(len(respBytes)),
		BytesOut:   bytesOut,
		Timestamp:  start,
	}
}

func (r *Runner) resolveURL(rawURL string) string {
	if strings.HasPrefix(rawURL, "http://") || strings.HasPrefix(rawURL, "https://") {
		return rawURL
	}
	return r.baseURL + "/" + strings.TrimLeft(rawURL, "/")
}

func (r *Runner) buildBody(b *core.Body) (io.Reader, int64) {
	if b == nil {
		return nil, 0
	}
	if b.JSON != nil {
		data, err := json.Marshal(b.JSON)
		if err != nil {
			return nil, 0
		}
		return bytes.NewReader(data), int64(len(data))
	}
	if b.Raw != "" {
		data := []byte(b.Raw)
		return bytes.NewReader(data), int64(len(data))
	}
	return nil, 0
}
