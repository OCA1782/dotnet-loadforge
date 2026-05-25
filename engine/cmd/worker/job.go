package main

import (
	"fmt"

	"github.com/loadforge/engine/core"
)

// ShardJobMessage matches the C# record published by LoadForge.Orchestrator.Worker.
// JSON tags are PascalCase to match System.Text.Json default serialization.
type ShardJobMessage struct {
	TestRunId       string   `json:"TestRunId"`
	ShardId         string   `json:"ShardId"`
	ShardIndex      int      `json:"ShardIndex"`
	ShardCount      int      `json:"ShardCount"`
	ScenarioContent string   `json:"ScenarioContent"`
	ApiBaseUrl      string   `json:"ApiBaseUrl"`
	OrganizationId  string   `json:"OrganizationId"`
	VirtualUsers    int      `json:"VirtualUsers"`
	DurationSeconds int      `json:"DurationSeconds"`
	RampUpSeconds   int      `json:"RampUpSeconds"`
	TargetRps       *int     `json:"TargetRps"`
	MaxErrorRate    *float64 `json:"MaxErrorRate"`
	MaxP95Ms        *int     `json:"MaxP95Ms"`
	MaxP99Ms        *int     `json:"MaxP99Ms"`
}

// planFromJob builds an engine Plan from a ShardJobMessage.
// VU and RPS are already shard-divided by the .NET Orchestrator; we run as a single shard.
func planFromJob(job *ShardJobMessage) (*core.Plan, error) {
	// ParseRaw skips validation; we override config values before BuildPlan validates them.
	scenario, err := core.ParseRaw([]byte(job.ScenarioContent), "scenario.yaml")
	if err != nil {
		return nil, fmt.Errorf("parse scenario: %w", err)
	}

	// Override with shard-specific values already computed by Orchestrator
	scenario.Config.VirtualUsers = job.VirtualUsers
	scenario.Config.Duration = fmt.Sprintf("%ds", job.DurationSeconds)
	scenario.Config.RampUp = fmt.Sprintf("%ds", job.RampUpSeconds)
	if job.TargetRps != nil {
		scenario.Config.TargetRps = *job.TargetRps
	} else {
		scenario.Config.TargetRps = 0
	}

	// shardIndex=0, shardCount=1: VU allocation already done by Orchestrator
	return core.BuildPlan(scenario, 0, 1)
}

// evaluateQualityGate returns true if the run passed all configured thresholds.
func evaluateQualityGate(job *ShardJobMessage, snap core.MetricSnapshot) bool {
	if job.MaxErrorRate != nil && snap.ErrorRate > *job.MaxErrorRate {
		return false
	}
	if job.MaxP95Ms != nil && snap.P95Ms > int64(*job.MaxP95Ms) {
		return false
	}
	if job.MaxP99Ms != nil && snap.P99Ms > int64(*job.MaxP99Ms) {
		return false
	}
	return true
}
