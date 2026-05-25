package core

import (
	"testing"
	"time"
)

func TestBuildPlan_SingleShard(t *testing.T) {
	s := &Scenario{
		Name: "test",
		Config: ScenarioConfig{
			VirtualUsers: 10,
			TargetRps:    100,
			Duration:     "1m",
			RampUp:       "10s",
			ThinkTime:    "250ms",
		},
		Steps: []Step{{Name: "s1", Request: Request{URL: "/foo"}}},
	}

	plan, err := BuildPlan(s, 0, 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if plan.ShardVU != 10 {
		t.Errorf("ShardVU = %d, want 10", plan.ShardVU)
	}
	if plan.ShardRps != 100 {
		t.Errorf("ShardRps = %d, want 100", plan.ShardRps)
	}
	if plan.Duration != time.Minute {
		t.Errorf("Duration = %v, want 1m", plan.Duration)
	}
	if plan.RampUp != 10*time.Second {
		t.Errorf("RampUp = %v, want 10s", plan.RampUp)
	}
}

func TestBuildPlan_MultiShard_Distribution(t *testing.T) {
	s := &Scenario{
		Name:   "test",
		Config: ScenarioConfig{VirtualUsers: 10, TargetRps: 100, Duration: "1m"},
		Steps:  []Step{{Name: "s1", Request: Request{URL: "/foo"}}},
	}

	// 3 shards: [3, 3, 4]
	cases := []struct{ index, wantVU, wantRps int }{
		{0, 3, 33},
		{1, 3, 33},
		{2, 4, 34}, // last shard gets remainder
	}

	for _, c := range cases {
		plan, err := BuildPlan(s, c.index, 3)
		if err != nil {
			t.Fatalf("shard %d: unexpected error: %v", c.index, err)
		}
		if plan.ShardVU != c.wantVU {
			t.Errorf("shard %d ShardVU = %d, want %d", c.index, plan.ShardVU, c.wantVU)
		}
		if plan.ShardRps != c.wantRps {
			t.Errorf("shard %d ShardRps = %d, want %d", c.index, plan.ShardRps, c.wantRps)
		}
	}
}

func TestBuildPlan_InvalidShardIndex(t *testing.T) {
	s := &Scenario{
		Name:   "test",
		Config: ScenarioConfig{VirtualUsers: 5, Duration: "1m"},
		Steps:  []Step{{Name: "s1", Request: Request{URL: "/foo"}}},
	}
	_, err := BuildPlan(s, 5, 3)
	if err == nil {
		t.Fatal("expected error for out-of-range shard index, got nil")
	}
}
