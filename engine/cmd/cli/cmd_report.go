package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type reportData struct {
	ID            string    `json:"id"`
	Status        string    `json:"status"`
	TotalRequests int64     `json:"totalRequests"`
	TotalErrors   int64     `json:"totalErrors"`
	ErrorRate     float64   `json:"errorRate"`
	RPS           float64   `json:"rps"`
	P50Ms         int64     `json:"p50Ms"`
	P90Ms         int64     `json:"p90Ms"`
	P95Ms         int64     `json:"p95Ms"`
	P99Ms         int64     `json:"p99Ms"`
	MaxMs         int64     `json:"maxMs"`
	StartedAt     time.Time `json:"startedAt"`
	FinishedAt    *time.Time `json:"finishedAt"`
}

func reportCmd(args []string) {
	fs := flag.NewFlagSet("report", flag.ExitOnError)
	apiURL := fs.String("api-url", "http://localhost:5000", "LoadForge API base URL")
	token := fs.String("token", "", "Bearer token for API authentication")
	output := fs.String("output", "text", "Output format: text|json|html")
	outFile := fs.String("out", "", "Write output to file instead of stdout")
	_ = fs.Parse(args)

	if fs.NArg() < 1 {
		fmt.Fprintln(os.Stderr, "usage: loadforge report <runId> [flags]")
		fs.PrintDefaults()
		os.Exit(1)
	}

	runID := fs.Arg(0)
	url := fmt.Sprintf("%s/api/test-runs/%s", *apiURL, runID)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	if *token != "" {
		req.Header.Set("Authorization", "Bearer "+*token)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		fmt.Fprintf(os.Stderr, "error: API returned %d: %s\n", resp.StatusCode, string(body))
		os.Exit(1)
	}

	var data reportData
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	out := os.Stdout
	if *outFile != "" {
		f, err := os.Create(*outFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
		defer f.Close()
		out = f
	}

	switch *output {
	case "json":
		enc := json.NewEncoder(out)
		enc.SetIndent("", "  ")
		_ = enc.Encode(data)
	case "html":
		writeReportHTML(out, &data)
	default:
		writeReportText(out, &data)
	}
}

func writeReportText(w io.Writer, d *reportData) {
	fmt.Fprintln(w)
	fmt.Fprintln(w, "╔══════════════════════════╗")
	fmt.Fprintln(w, "║  LoadForge Run Report    ║")
	fmt.Fprintln(w, "╚══════════════════════════╝")
	fmt.Fprintf(w, "  Run ID        : %s\n", d.ID)
	fmt.Fprintf(w, "  Status        : %s\n", d.Status)
	fmt.Fprintf(w, "  Started       : %s\n", d.StartedAt.Format(time.RFC3339))
	if d.FinishedAt != nil {
		fmt.Fprintf(w, "  Finished      : %s\n", d.FinishedAt.Format(time.RFC3339))
	}
	fmt.Fprintln(w)
	fmt.Fprintf(w, "  Total Requests: %d\n", d.TotalRequests)
	fmt.Fprintf(w, "  Total Errors  : %d\n", d.TotalErrors)
	fmt.Fprintf(w, "  Error Rate    : %.2f%%\n", d.ErrorRate*100)
	fmt.Fprintf(w, "  RPS           : %.1f\n", d.RPS)
	fmt.Fprintf(w, "  P50           : %dms\n", d.P50Ms)
	fmt.Fprintf(w, "  P90           : %dms\n", d.P90Ms)
	fmt.Fprintf(w, "  P95           : %dms\n", d.P95Ms)
	fmt.Fprintf(w, "  P99           : %dms\n", d.P99Ms)
	fmt.Fprintf(w, "  Max           : %dms\n", d.MaxMs)
	fmt.Fprintln(w)
}

func writeReportHTML(w io.Writer, d *reportData) {
	finished := "—"
	if d.FinishedAt != nil {
		finished = d.FinishedAt.Format(time.RFC3339)
	}
	fmt.Fprintf(w, `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LoadForge Report — %s</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .meta { color: #666; font-size: 0.875rem; margin-bottom: 24px; }
    table { width: 100%%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e5e5; }
    th { background: #f5f5f5; font-weight: 600; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
    .status-completed { background: #d1fae5; color: #065f46; }
    .status-failed { background: #fee2e2; color: #991b1b; }
    .status-running { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <h1>LoadForge Run Report</h1>
  <div class="meta">
    Run ID: <strong>%s</strong> &nbsp;|&nbsp;
    Status: <span class="status status-%s">%s</span> &nbsp;|&nbsp;
    Started: %s &nbsp;|&nbsp; Finished: %s
  </div>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Total Requests</td><td>%d</td></tr>
      <tr><td>Total Errors</td><td>%d</td></tr>
      <tr><td>Error Rate</td><td>%.2f%%</td></tr>
      <tr><td>RPS</td><td>%.1f</td></tr>
      <tr><td>P50 Latency</td><td>%dms</td></tr>
      <tr><td>P90 Latency</td><td>%dms</td></tr>
      <tr><td>P95 Latency</td><td>%dms</td></tr>
      <tr><td>P99 Latency</td><td>%dms</td></tr>
      <tr><td>Max Latency</td><td>%dms</td></tr>
    </tbody>
  </table>
</body>
</html>
`,
		d.ID,
		d.ID,
		d.Status, d.Status,
		d.StartedAt.Format(time.RFC3339), finished,
		d.TotalRequests,
		d.TotalErrors,
		d.ErrorRate*100,
		d.RPS,
		d.P50Ms, d.P90Ms, d.P95Ms, d.P99Ms, d.MaxMs,
	)
}
