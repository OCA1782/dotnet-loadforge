package core

import (
	"context"
	"time"
)

// ProtocolRunner is the interface each protocol runner must implement.
type ProtocolRunner interface {
	Execute(ctx context.Context, step Step) RequestResult
}

// VU represents a single virtual user's lifecycle.
type VU struct {
	id      int
	plan    *Plan
	runner  ProtocolRunner
	metrics *Metrics
	limiter *RateLimiter
}

func NewVU(id int, plan *Plan, runner ProtocolRunner, metrics *Metrics, limiter *RateLimiter) *VU {
	return &VU{
		id:      id,
		plan:    plan,
		runner:  runner,
		metrics: metrics,
		limiter: limiter,
	}
}

// Run executes the VU's lifecycle until ctx is cancelled or duration expires.
func (v *VU) Run(ctx context.Context) {
	v.metrics.IncActiveVU()
	defer v.metrics.DecActiveVU()

	deadline := time.Now().Add(v.plan.Duration)

	for {
		if ctx.Err() != nil || time.Now().After(deadline) {
			return
		}

		for _, step := range v.plan.Steps {
			if ctx.Err() != nil || time.Now().After(deadline) {
				return
			}

			// Rate limiting — waits for token
			if err := v.limiter.Wait(ctx); err != nil {
				return
			}

			result := v.runner.Execute(ctx, step)
			assertions := CheckAssertions(step.Assertions, result)

			// Mark assertion failures as errors in the result
			if result.Error == nil && AnyFailed(assertions) {
				result.Error = &AssertionError{Message: FailMessages(assertions)}
			}

			v.metrics.Record(result)
		}

		// Think time between iterations
		if v.plan.ThinkTime > 0 {
			select {
			case <-ctx.Done():
				return
			case <-time.After(v.plan.ThinkTime):
			}
		}
	}
}

// AssertionError wraps assertion failures as an error type.
type AssertionError struct {
	Message string
}

func (e *AssertionError) Error() string { return "assertion failed: " + e.Message }
