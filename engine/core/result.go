package core

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

// Streamer periodically sends metric snapshots to the API.
type Streamer struct {
	runID    string
	endpoint string
	interval time.Duration
	metrics  *Metrics
	client   *http.Client
}

func NewStreamer(runID, apiBaseURL string, interval time.Duration, metrics *Metrics) *Streamer {
	return &Streamer{
		runID:    runID,
		endpoint: fmt.Sprintf("%s/internal/runs/%s/metrics", apiBaseURL, runID),
		interval: interval,
		metrics:  metrics,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

// Run streams metrics at the configured interval until ctx is cancelled.
// It performs a final flush before returning.
func (s *Streamer) Run(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.flush()
			return
		case <-ticker.C:
			s.flush()
		}
	}
}

func (s *Streamer) flush() {
	snap := s.metrics.Snapshot()
	payload := snapshotToPayload(s.runID, snap)

	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("streamer: marshal error: %v", err)
		return
	}

	resp, err := s.client.Post(s.endpoint, "application/json", bytes.NewReader(data))
	if err != nil {
		log.Printf("streamer: send error: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Printf("streamer: API returned %d for run %s", resp.StatusCode, s.runID)
	}
}

type metricPayload struct {
	RunID         string    `json:"runId"`
	Timestamp     time.Time `json:"timestamp"`
	Rps           float64   `json:"rps"`
	ActiveVu      int       `json:"activeVu"`
	P50Ms         int64     `json:"p50Ms"`
	P90Ms         int64     `json:"p90Ms"`
	P95Ms         int64     `json:"p95Ms"`
	P99Ms         int64     `json:"p99Ms"`
	MaxMs         int64     `json:"maxMs"`
	ErrorRate     float64   `json:"errorRate"`
	TotalRequests int64     `json:"totalRequests"`
	TotalErrors   int64     `json:"totalErrors"`
	BytesIn       int64     `json:"bytesIn"`
	BytesOut      int64     `json:"bytesOut"`
}

func snapshotToPayload(runID string, s MetricSnapshot) metricPayload {
	return metricPayload{
		RunID:         runID,
		Timestamp:     s.Timestamp,
		Rps:           s.Rps,
		ActiveVu:      s.ActiveVU,
		P50Ms:         s.P50Ms,
		P90Ms:         s.P90Ms,
		P95Ms:         s.P95Ms,
		P99Ms:         s.P99Ms,
		MaxMs:         s.MaxMs,
		ErrorRate:     s.ErrorRate,
		TotalRequests: s.TotalRequests,
		TotalErrors:   s.TotalErrors,
		BytesIn:       s.BytesIn,
		BytesOut:      s.BytesOut,
	}
}
