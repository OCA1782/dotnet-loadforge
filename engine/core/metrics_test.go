package core

import (
	"testing"
)

func TestMetrics_Record_And_Snapshot(t *testing.T) {
	m := NewMetrics()

	m.Record(RequestResult{StatusCode: 200, LatencyMs: 100})
	m.Record(RequestResult{StatusCode: 200, LatencyMs: 200})
	m.Record(RequestResult{StatusCode: 500, LatencyMs: 50})

	snap := m.Snapshot()

	if snap.TotalRequests != 3 {
		t.Errorf("TotalRequests = %d, want 3", snap.TotalRequests)
	}
	if snap.TotalErrors != 1 {
		t.Errorf("TotalErrors = %d, want 1 (status 500)", snap.TotalErrors)
	}
	if snap.P50Ms == 0 {
		t.Error("P50Ms should be > 0 after recording latencies")
	}
}

func TestMetrics_ActiveVU(t *testing.T) {
	m := NewMetrics()

	m.IncActiveVU()
	m.IncActiveVU()
	if m.Snapshot().ActiveVU != 2 {
		t.Errorf("ActiveVU = %d, want 2", m.Snapshot().ActiveVU)
	}

	m.DecActiveVU()
	if m.Snapshot().ActiveVU != 1 {
		t.Errorf("ActiveVU = %d, want 1", m.Snapshot().ActiveVU)
	}
}

func TestMetrics_ErrorRate(t *testing.T) {
	m := NewMetrics()
	m.Record(RequestResult{StatusCode: 200, LatencyMs: 50})
	m.Record(RequestResult{StatusCode: 500, LatencyMs: 50})

	snap := m.Snapshot()
	if snap.ErrorRate != 0.5 {
		t.Errorf("ErrorRate = %.2f, want 0.50", snap.ErrorRate)
	}
}
