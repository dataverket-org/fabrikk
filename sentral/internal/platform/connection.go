// SPDX-License-Identifier: AGPL-3.0-or-later

// Package platform is the mechanism Sentral's contexts share: the connection
// to the server, the health port, and the run loop that ties them together.
package platform

import (
	"errors"
	"log/slog"
	"sync/atomic"
	"time"

	"github.com/nats-io/nats.go"
)

// ErrAddress is returned for a server address Sentral cannot use. It names
// the variable and never the value, which may carry a credential.
var ErrAddress = errors.New("NATS_URL is not an address Sentral can use")

// timing is how patiently the client waits. Production values are set in
// Connect; tests shorten them.
type timing struct {
	ping          time.Duration // between pings; three unanswered intervals mean the connection is stale
	reconnectWait time.Duration // between attempts to reach the server
	dial          time.Duration // one attempt: the dial and the server's greeting
}

// Connection is Sentral's connection to the server. It keeps trying for as
// long as the server cannot be reached, and says whether it is connected now.
type Connection struct {
	nc        *nats.Conn
	connected atomic.Bool
	closed    chan struct{}
}

// Connect starts connecting to the server at address and returns at once,
// connected or not: the first connection and every later one are retried
// without limit.
func Connect(address string, log *slog.Logger) (*Connection, error) {
	return connect(address, log, timing{
		ping:          5 * time.Second,
		reconnectWait: 2 * time.Second,
		dial:          2 * time.Second,
	})
}

func connect(address string, log *slog.Logger, t timing) (*Connection, error) {
	c := &Connection{closed: make(chan struct{})}

	// The state is kept from the client's own callbacks, which it runs in
	// order. Asking the client instead would wait on its lock for as long as
	// an attempt to reach the server takes.
	up := func(event string) nats.ConnHandler {
		return func(nc *nats.Conn) {
			c.connected.Store(true)
			log.Info(event, "server", nc.ConnectedAddr())
		}
	}
	nc, err := nats.Connect(address,
		nats.Name("sentral"),
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(t.reconnectWait),
		nats.ReconnectJitter(t.reconnectWait/10, t.reconnectWait/10),
		nats.PingInterval(t.ping),
		nats.MaxPingsOutstanding(2),
		nats.Timeout(t.dial),
		nats.ConnectHandler(up("connected")),
		nats.ReconnectHandler(up("reconnected")),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			c.connected.Store(false)
			log.Warn("disconnected", "reason", reason(err))
		}),
		nats.ClosedHandler(func(nc *nats.Conn) {
			c.connected.Store(false)
			log.Info("closed", "reason", reason(nc.LastError()))
			close(c.closed)
		}),
	)
	if err != nil {
		// The client's error quotes the address it was given.
		return nil, ErrAddress
	}
	c.nc = nc
	return c, nil
}

// Connected reports whether the connection is connected right now.
func (c *Connection) Connected() bool { return c.connected.Load() }

// Closed is closed when the connection is closed for good: by Close, or by
// the client itself when the server refuses it the same way twice.
func (c *Connection) Closed() <-chan struct{} { return c.closed }

// LastError is the reason the client gave for its latest failure, if any.
func (c *Connection) LastError() error { return c.nc.LastError() }

// Close closes the connection and waits, briefly, until the client has said
// so, so that its last log line is written before the process ends.
func (c *Connection) Close() {
	c.nc.Close()
	select {
	case <-c.closed:
	case <-time.After(time.Second):
	}
}

func reason(err error) string {
	if err == nil {
		return "none"
	}
	return err.Error()
}
