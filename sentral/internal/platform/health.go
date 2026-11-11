// SPDX-License-Identifier: AGPL-3.0-or-later

package platform

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"time"
)

// Handler answers the health port: /healthz while the process runs, and
// /readyz only while ready says so. It asks on every request.
func Handler(ready func() bool) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprintln(w, "ok")
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, _ *http.Request) {
		if !ready() {
			http.Error(w, "not ready", http.StatusServiceUnavailable)
			return
		}
		fmt.Fprintln(w, "ready")
	})
	return mux
}

// Probe asks the health port at address for path and fails unless the answer
// is 200. An address with no host, as a listener takes it, is this machine.
func Probe(ctx context.Context, address, path string) error {
	host, port, err := net.SplitHostPort(address)
	if err != nil {
		return fmt.Errorf("HEALTH_ADDR is not host:port: %w", err)
	}
	if host == "" {
		host = "127.0.0.1"
	}

	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"http://"+net.JoinHostPort(host, port)+path, nil)
	if err != nil {
		return err
	}
	// One question, one connection: nothing is left open on the port asked.
	request.Close = true
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("%s answered %d", path, response.StatusCode)
	}
	return nil
}
