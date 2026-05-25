package core

import (
	"context"
	"sync"
	"time"
)

// RateLimiter is a token bucket limiter for RPS control.
// targetRps <= 0 means unlimited.
type RateLimiter struct {
	targetRps int
	tokens    float64
	maxTokens float64
	mu        sync.Mutex
	lastRefill time.Time
}

func NewRateLimiter(targetRps int) *RateLimiter {
	max := float64(targetRps)
	if max <= 0 {
		max = 0
	}
	return &RateLimiter{
		targetRps:  targetRps,
		tokens:     max,
		maxTokens:  max,
		lastRefill: time.Now(),
	}
}

// Wait blocks until a token is available or ctx is cancelled.
func (r *RateLimiter) Wait(ctx context.Context) error {
	if r.targetRps <= 0 {
		return nil // unlimited
	}

	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		r.mu.Lock()
		now := time.Now()
		elapsed := now.Sub(r.lastRefill).Seconds()
		r.lastRefill = now

		// Refill tokens based on elapsed time
		r.tokens += elapsed * float64(r.targetRps)
		if r.tokens > r.maxTokens {
			r.tokens = r.maxTokens
		}

		if r.tokens >= 1 {
			r.tokens--
			r.mu.Unlock()
			return nil
		}
		r.mu.Unlock()

		// Wait for next token (sleep proportional to rate)
		sleepMs := time.Duration(1000/float64(r.targetRps)) * time.Millisecond
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(sleepMs):
		}
	}
}
