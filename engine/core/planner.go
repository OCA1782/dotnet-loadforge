package core

import (
	"fmt"
	"time"
)

// Plan holds the resolved execution plan for a single shard.
type Plan struct {
	ScenarioName string
	ShardIndex   int
	ShardCount   int

	TotalVU      int
	ShardVU      int
	Duration     time.Duration
	RampUp       time.Duration
	ThinkTime    time.Duration
	TargetRps    int  // 0 = unlimited
	ShardRps     int

	Steps []Step
}

// BuildPlan creates an execution plan for a single shard from a parsed scenario.
// shardIndex is 0-based, shardCount is total number of workers.
func BuildPlan(s *Scenario, shardIndex, shardCount int) (*Plan, error) {
	if shardCount < 1 {
		return nil, fmt.Errorf("shardCount must be >= 1")
	}
	if shardIndex < 0 || shardIndex >= shardCount {
		return nil, fmt.Errorf("shardIndex %d out of range [0, %d)", shardIndex, shardCount)
	}

	duration, err := parseDuration(s.Config.Duration)
	if err != nil {
		return nil, fmt.Errorf("parsing duration: %w", err)
	}

	rampUp, err := parseDuration(s.Config.RampUp)
	if err != nil {
		rampUp = 0
	}

	thinkTime, err := parseDuration(s.Config.ThinkTime)
	if err != nil {
		thinkTime = 0
	}

	shardVU := distribute(s.Config.VirtualUsers, shardCount, shardIndex)
	shardRps := 0
	if s.Config.TargetRps > 0 {
		shardRps = distribute(s.Config.TargetRps, shardCount, shardIndex)
	}

	return &Plan{
		ScenarioName: s.Name,
		ShardIndex:   shardIndex,
		ShardCount:   shardCount,
		TotalVU:      s.Config.VirtualUsers,
		ShardVU:      shardVU,
		Duration:     duration,
		RampUp:       rampUp,
		ThinkTime:    thinkTime,
		TargetRps:    s.Config.TargetRps,
		ShardRps:     shardRps,
		Steps:        s.Steps,
	}, nil
}

// distribute divides total evenly; the last shard gets the remainder.
func distribute(total, count, index int) int {
	base := total / count
	if index == count-1 {
		return total - base*(count-1)
	}
	return base
}

// parseDuration handles Go duration strings ("10m", "2m30s", "250ms") and also plain seconds ("60").
func parseDuration(s string) (time.Duration, error) {
	if s == "" {
		return 0, nil
	}
	d, err := time.ParseDuration(s)
	if err != nil {
		return 0, fmt.Errorf("invalid duration %q: %w", s, err)
	}
	return d, nil
}
