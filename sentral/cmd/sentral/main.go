// SPDX-License-Identifier: AGPL-3.0-or-later

// Sentral is the control plane's service. This is its wiring and nothing
// else: with no argument it runs, and with probe it asks a running Sentral's
// health port, which is how a container with no shell is probed.
package main

import (
	"context"
	"io"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"

	"git.dataverket.org/dataverket/fabrikk/sentral/internal/platform"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	code := run(ctx, os.Args[1:], os.Getenv, os.Stderr)
	stop()
	os.Exit(code)
}

// run is the whole program, with its surroundings handed in. It returns the
// exit code: 0 for a clean stop or a passing probe, 1 for a failure while
// running or a failing probe, 2 for a configuration or a command it refuses.
func run(ctx context.Context, args []string, getenv func(string) string, stderr io.Writer) int {
	log := slog.New(slog.NewJSONHandler(stderr, nil))
	health := getenv("HEALTH_ADDR")
	if health == "" {
		health = ":8080"
	}

	switch {
	case len(args) == 0:
		return serve(ctx, getenv("NATS_URL"), health, log)
	case args[0] == "probe" && len(args) <= 2:
		path := "/readyz"
		if len(args) == 2 {
			path = args[1]
		}
		if err := platform.Probe(ctx, health, path); err != nil {
			log.Error("probe failed", "path", path, "reason", err.Error())
			return 1
		}
		return 0
	default:
		log.Error("not a command Sentral knows", "usage", "sentral [probe [path]]")
		return 2
	}
}

func serve(ctx context.Context, address, health string, log *slog.Logger) int {
	if address == "" {
		log.Error("NATS_URL is not set")
		return 2
	}
	listener, err := net.Listen("tcp", health)
	if err != nil {
		log.Error("HEALTH_ADDR cannot be listened on", "reason", err.Error())
		return 2
	}
	conn, err := platform.Connect(address, log)
	if err != nil {
		listener.Close()
		log.Error(err.Error())
		return 2
	}
	if err := platform.Run(ctx, conn, listener, log); err != nil {
		log.Error("stopped", "reason", err.Error())
		return 1
	}
	return 0
}
