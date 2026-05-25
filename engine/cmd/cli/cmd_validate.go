package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/loadforge/engine/core"
)

func validateCmd(args []string) {
	fs := flag.NewFlagSet("validate", flag.ExitOnError)
	_ = fs.Parse(args)

	if fs.NArg() < 1 {
		fmt.Fprintln(os.Stderr, "usage: loadforge validate <scenario.yaml> [scenario2.yaml ...]")
		os.Exit(1)
	}

	allOK := true
	for _, path := range fs.Args() {
		scenario, err := core.ParseFile(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "FAIL  %s\n      %v\n", path, err)
			allOK = false
			continue
		}
		fmt.Printf("OK    %s\n", path)
		fmt.Printf("      name=%q  vus=%d  duration=%s  steps=%d\n",
			scenario.Name,
			scenario.Config.VirtualUsers,
			scenario.Config.Duration,
			len(scenario.Steps),
		)
	}

	if !allOK {
		os.Exit(1)
	}
}
