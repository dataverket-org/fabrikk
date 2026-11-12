// SPDX-License-Identifier: AGPL-3.0-or-later

package platform

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"
)

// shutdownGrace is how long a stop waits for health requests in flight.
const shutdownGrace = 5 * time.Second

// healthServer is the server of the health port. What net/http has to report
// itself, a connection it could not accept or a handler that panicked, goes
// through log: left alone it writes plain text to stderr.
func healthServer(ready func() bool, log *slog.Logger) *http.Server {
	return &http.Server{
		Handler:           Handler(ready),
		ReadHeaderTimeout: shutdownGrace,
		ErrorLog:          slog.NewLogLogger(log.Handler(), slog.LevelWarn),
	}
}

// Run answers the health port on listener until ctx is cancelled, then closes
// the port and the connection and returns nil. If the connection is closed
// for good while it runs, it stops the same way and returns why: a Sentral
// that cannot become ready again does not stay up.
func Run(ctx context.Context, conn *Connection, listener net.Listener, log *slog.Logger) error {
	server := healthServer(conn.Connected, log)
	served := make(chan error, 1)
	go func() { served <- server.Serve(listener) }()
	log.Info("serving", "health", listener.Addr().String())

	var result error
	select {
	case <-ctx.Done():
		log.Info("stopping")
	case <-conn.Closed():
		result = fmt.Errorf("the connection was closed for good: %s", reason(conn.LastError()))
	case err := <-served:
		result = fmt.Errorf("the health port stopped: %w", err)
	}

	shutdown, cancel := context.WithTimeout(context.Background(), shutdownGrace)
	defer cancel()
	if err := server.Shutdown(shutdown); err != nil {
		server.Close()
	}
	conn.Close()
	return result
}
