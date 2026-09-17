// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Dataverket

// docs-check enforces docs/schema.yaml over the docs/ tree. Wiring only: flags, output, exit code.
package main

import (
	"flag"
	"fmt"
	"os"

	"git.dataverket.org/dataverket/fabrikk/tools/internal/docscheck"
)

func main() {
	root := flag.String("root", ".", "repository root")
	config := flag.String("config", "docs/schema.yaml", "schema, relative to root")
	flag.Parse()

	cfg, err := docscheck.LoadConfig(*root + "/" + *config)
	if err != nil {
		fmt.Fprintf(os.Stderr, "docs-check: %v\n", err)
		os.Exit(2)
	}
	report, err := docscheck.Check(*root, cfg, docscheck.GitTracked(*root))
	if err != nil {
		fmt.Fprintf(os.Stderr, "docs-check: %v\n", err)
		os.Exit(2)
	}
	for _, issue := range report.Issues {
		fmt.Fprintf(os.Stderr, "docs-check: %s [%s]: %s\n", issue.Path, issue.Rule, issue.Message)
	}
	if len(report.Issues) > 0 {
		fmt.Fprintf(os.Stderr, "docs-check: %d pages, %d issues\n", report.Pages, len(report.Issues))
		os.Exit(1)
	}
	fmt.Printf("docs-check: ok (%d pages, schema %s)\n", report.Pages, *config)
}
