package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/loadforge/engine/core"
	"github.com/loadforge/engine/internal/random"
	httprunner "github.com/loadforge/engine/protocols/http"
)

func runCmd(args []string) {
	fs := flag.NewFlagSet("run", flag.ExitOnError)
	apiURL := fs.String("api-url", "", "API base URL for metric streaming (optional)")
	runID := fs.String("run-id", "", "Run ID for metric streaming (default: auto UUID)")
	output := fs.String("output", "text", "Output format: text|json")
	maxErrorRate := fs.Float64("max-error-rate", -1, "Quality gate: max error rate 0–1 (e.g. 0.01)")
	maxP95 := fs.Int("max-p95", -1, "Quality gate: max P95 latency in ms")
	maxP99 := fs.Int("max-p99", -1, "Quality gate: max P99 latency in ms")

	_ = fs.Parse(args)

	if fs.NArg() < 1 {
		fmt.Fprintln(os.Stderr, "usage: loadforge run [flags] <scenario.yaml>")
		fs.PrintDefaults()
		os.Exit(1)
	}

	scenarioPath := fs.Arg(0)
	if *runID == "" {
		*runID = "local-" + random.UUIDv4()[:8]
	}

	scenario, err := core.ParseFile(scenarioPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	plan, err := core.BuildPlan(scenario, 0, 1)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	baseURL := ""
	if env, ok := scenario.Environments["default"]; ok {
		baseURL = env.BaseURL
	}

	fmt.Fprintf(os.Stderr, "[loadforge] scenario: %s | VUs: %d | duration: %s\n",
		scenario.Name, plan.ShardVU, plan.Duration)

	runner := httprunner.NewRunner(baseURL, nil)
	engine := core.NewEngine(plan, runner)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	streamDone := make(chan struct{})
	if *apiURL != "" {
		streamer := core.NewStreamer(*runID, *apiURL, 5*time.Second, engine.Metrics())
		streamCtx, streamCancel := context.WithCancel(ctx)
		go func() {
			defer close(streamDone)
			streamer.Run(streamCtx)
		}()
		defer func() {
			streamCancel()
			<-streamDone
		}()
	} else {
		close(streamDone)
	}

	engine.Run(ctx)

	snap := engine.Metrics().Snapshot()
	passed := qualityGate(snap, *maxErrorRate, *maxP95, *maxP99)

	switch *output {
	case "json":
		printRunJSON(snap, passed, *runID)
	default:
		printRunText(snap, passed)
	}

	if !passed {
		os.Exit(1)
	}
}

func qualityGate(snap core.MetricSnapshot, maxErrRate float64, maxP95, maxP99 int) bool {
	if maxErrRate >= 0 && snap.ErrorRate > maxErrRate {
		return false
	}
	if maxP95 >= 0 && snap.P95Ms > int64(maxP95) {
		return false
	}
	if maxP99 >= 0 && snap.P99Ms > int64(maxP99) {
		return false
	}
	// Default gate when no flags specified: ≤1% error rate
	if maxErrRate < 0 && maxP95 < 0 && maxP99 < 0 {
		return snap.ErrorRate <= 0.01
	}
	return true
}

type runResult struct {
	RunID         string  `json:"runId"`
	Passed        bool    `json:"passed"`
	TotalRequests int64   `json:"totalRequests"`
	TotalErrors   int64   `json:"totalErrors"`
	ErrorRate     float64 `json:"errorRate"`
	Rps           float64 `json:"rps"`
	P50Ms         int64   `json:"p50Ms"`
	P90Ms         int64   `json:"p90Ms"`
	P95Ms         int64   `json:"p95Ms"`
	P99Ms         int64   `json:"p99Ms"`
	MaxMs         int64   `json:"maxMs"`
}

func printRunJSON(snap core.MetricSnapshot, passed bool, runID string) {
	r := runResult{
		RunID:         runID,
		Passed:        passed,
		TotalRequests: snap.TotalRequests,
		TotalErrors:   snap.TotalErrors,
		ErrorRate:     snap.ErrorRate,
		Rps:           snap.Rps,
		P50Ms:         snap.P50Ms,
		P90Ms:         snap.P90Ms,
		P95Ms:         snap.P95Ms,
		P99Ms:         snap.P99Ms,
		MaxMs:         snap.MaxMs,
	}
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	_ = enc.Encode(r)
}

func printRunText(snap core.MetricSnapshot, passed bool) {
	fmt.Println()
	fmt.Println("╔══════════════════════════╗")
	fmt.Println("║  LoadForge Run Summary   ║")
	fmt.Println("╚══════════════════════════╝")
	fmt.Printf("  Total Requests : %d\n", snap.TotalRequests)
	fmt.Printf("  Total Errors   : %d\n", snap.TotalErrors)
	fmt.Printf("  Error Rate     : %.2f%%\n", snap.ErrorRate*100)
	fmt.Printf("  RPS            : %.1f\n", snap.Rps)
	fmt.Printf("  P50            : %dms\n", snap.P50Ms)
	fmt.Printf("  P90            : %dms\n", snap.P90Ms)
	fmt.Printf("  P95            : %dms\n", snap.P95Ms)
	fmt.Printf("  P99            : %dms\n", snap.P99Ms)
	fmt.Printf("  Max            : %dms\n", snap.MaxMs)
	if passed {
		fmt.Println("\n✅ Quality gate PASSED")
	} else {
		fmt.Println("\n❌ Quality gate FAILED")
	}
}
