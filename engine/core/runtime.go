package core

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/loadforge/engine/internal/random"
)

// Engine runs a full load test shard according to a Plan.
type Engine struct {
	plan    *Plan
	runner  ProtocolRunner
	metrics *Metrics
	limiter *RateLimiter
}

func NewEngine(plan *Plan, runner ProtocolRunner) *Engine {
	return &Engine{
		plan:    plan,
		runner:  runner,
		metrics: NewMetrics(),
		limiter: NewRateLimiter(plan.ShardRps),
	}
}

func (e *Engine) Metrics() *Metrics { return e.metrics }

// Run starts all VUs, handles ramp-up, and blocks until done or ctx is cancelled.
func (e *Engine) Run(ctx context.Context) {
	log.Printf("[engine] shard %d/%d — %d VUs, duration %s, ramp-up %s",
		e.plan.ShardIndex+1, e.plan.ShardCount,
		e.plan.ShardVU, e.plan.Duration, e.plan.RampUp)

	runCtx, cancel := context.WithTimeout(ctx, e.plan.Duration+e.plan.RampUp+5*time.Second)
	defer cancel()

	var wg sync.WaitGroup
	wg.Add(e.plan.ShardVU)

	for i := range e.plan.ShardVU {
		// Ramp-up: stagger VU start times
		if e.plan.RampUp > 0 && e.plan.ShardVU > 1 {
			stagger := time.Duration(int64(e.plan.RampUp) / int64(e.plan.ShardVU) * int64(i))
			stagger = random.Jitter(stagger, 0.05) // ±5% jitter to avoid thundering herd
			select {
			case <-runCtx.Done():
				wg.Done()
				continue
			case <-time.After(stagger):
			}
		}

		vu := NewVU(i, e.plan, e.runner, e.metrics, e.limiter)
		go func() {
			defer wg.Done()
			vu.Run(runCtx)
		}()
	}

	wg.Wait()
	log.Printf("[engine] shard %d/%d done — total reqs: %d, errors: %d",
		e.plan.ShardIndex+1, e.plan.ShardCount,
		e.metrics.Snapshot().TotalRequests,
		e.metrics.Snapshot().TotalErrors)
}
