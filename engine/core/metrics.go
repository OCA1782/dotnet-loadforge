package core

import (
	"sync"
	"sync/atomic"
	"time"

	hdrhistogram "github.com/HdrHistogram/hdrhistogram-go"
)

// RequestResult holds the outcome of a single HTTP request.
type RequestResult struct {
	StepName   string
	Method     string
	URL        string
	StatusCode int
	LatencyMs  int64
	BytesIn    int64
	BytesOut   int64
	Error      error
	Timestamp  time.Time
}

// Metrics aggregates results across all VUs for a single shard.
type Metrics struct {
	mu          sync.Mutex
	hist        *hdrhistogram.Histogram // latency in ms, range 0..600_000 (10 min)
	totalReqs   atomic.Int64
	totalErrors atomic.Int64
	bytesIn     atomic.Int64
	bytesOut    atomic.Int64
	activeVU    atomic.Int32
	startedAt   time.Time
}

func NewMetrics() *Metrics {
	return &Metrics{
		hist:      hdrhistogram.New(1, 600_000, 3),
		startedAt: time.Now(),
	}
}

func (m *Metrics) Record(r RequestResult) {
	m.totalReqs.Add(1)
	if r.Error != nil || r.StatusCode >= 400 {
		m.totalErrors.Add(1)
	}
	m.bytesIn.Add(r.BytesIn)
	m.bytesOut.Add(r.BytesOut)

	m.mu.Lock()
	m.hist.RecordValue(r.LatencyMs)
	m.mu.Unlock()
}

func (m *Metrics) IncActiveVU() { m.activeVU.Add(1) }
func (m *Metrics) DecActiveVU() { m.activeVU.Add(-1) }

// Snapshot returns an immutable point-in-time summary.
func (m *Metrics) Snapshot() MetricSnapshot {
	m.mu.Lock()
	defer m.mu.Unlock()

	total := m.totalReqs.Load()
	errors := m.totalErrors.Load()

	elapsed := time.Since(m.startedAt).Seconds()
	rps := 0.0
	if elapsed > 0 {
		rps = float64(total) / elapsed
	}

	errorRate := 0.0
	if total > 0 {
		errorRate = float64(errors) / float64(total)
	}

	return MetricSnapshot{
		Timestamp:     time.Now(),
		TotalRequests: total,
		TotalErrors:   errors,
		ErrorRate:     errorRate,
		Rps:           rps,
		ActiveVU:      int(m.activeVU.Load()),
		P50Ms:         m.hist.ValueAtQuantile(50),
		P90Ms:         m.hist.ValueAtQuantile(90),
		P95Ms:         m.hist.ValueAtQuantile(95),
		P99Ms:         m.hist.ValueAtQuantile(99),
		MaxMs:         m.hist.Max(),
		BytesIn:       m.bytesIn.Load(),
		BytesOut:      m.bytesOut.Load(),
	}
}

// MetricSnapshot is a point-in-time immutable metric summary.
type MetricSnapshot struct {
	Timestamp     time.Time
	TotalRequests int64
	TotalErrors   int64
	ErrorRate     float64
	Rps           float64
	ActiveVU      int
	P50Ms         int64
	P90Ms         int64
	P95Ms         int64
	P99Ms         int64
	MaxMs         int64
	BytesIn       int64
	BytesOut      int64
}
