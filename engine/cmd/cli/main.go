package main

import (
	"fmt"
	"os"
)

func main() {
	if len(os.Args) < 2 {
		printHelp()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "run":
		runCmd(os.Args[2:])
	case "validate":
		validateCmd(os.Args[2:])
	case "report":
		reportCmd(os.Args[2:])
	case "help", "--help", "-h":
		printHelp()
	default:
		fmt.Fprintf(os.Stderr, "error: unknown command %q\n\n", os.Args[1])
		printHelp()
		os.Exit(1)
	}
}

func printHelp() {
	fmt.Print(`LoadForge CLI — Modern Load Testing

Usage:
  loadforge <command> [flags] [args]

Commands:
  run       Run a scenario file locally and print a summary
  validate  Validate a scenario YAML file (parse + DSL checks only)
  report    Fetch and display a run report from the LoadForge API

Examples:
  loadforge run scenario.yaml
  loadforge run scenario.yaml --max-error-rate 0.01 --max-p95 500 --output json
  loadforge validate scenario.yaml
  loadforge report <runId> --api-url http://localhost:5000 --token $TOKEN
  loadforge report <runId> --output html --out report.html

Run "loadforge <command> --help" for command-specific flags.
`)
}
