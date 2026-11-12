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

// How patiently the client waits.
const (
	pingInterval  = 5 * time.Second // between pings; three unanswered intervals mean the connection is stale
	reconnectWait = 2 * time.Second // between attempts to reach the server
	dialTimeout   = 2 * time.Second // one attempt: the dial and the server's greeting
)

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
	c := &Connection{closed: make(chan struct{})}
	nc, err := nats.Connect(address, c.options(log)...)
	if err != nil {
		// The client's error quotes the address it was given.
		return nil, ErrAddress
	}
	c.nc = nc
	return c, nil
}

// options is everything the client is told: how patiently it waits, and where
// it reports. Every report goes through log, so nothing the client has to say
// reaches stderr around it.
//
// The state is kept from the client's own callbacks, which it runs in order,
// one at a time. Asking the client instead would wait on its lock for as long
// as an attempt to reach the server takes.
func (c *Connection) options(log *slog.Logger) []nats.Option {
	// The reason last logged for an attempt that failed. The client tries
	// again every reconnectWait, and an outage is one line for as long as its
	// reason stays the same. A connection forgets it, so the next outage is
	// logged from its first attempt.
	var lastReason string
	up := func(event string) nats.ConnHandler {
		return func(nc *nats.Conn) {
			c.connected.Store(true)
			lastReason = ""
			log.Info(event, "server", nc.ConnectedAddr())
		}
	}
	return []nats.Option{
		nats.Name("sentral"),
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(reconnectWait),
		nats.ReconnectJitter(reconnectWait/10, reconnectWait/10),
		nats.PingInterval(pingInterval),
		nats.MaxPingsOutstanding(2),
		nats.Timeout(dialTimeout),
		nats.ConnectHandler(up("connected")),
		nats.ReconnectHandler(up("reconnected")),
		nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
			c.connected.Store(false)
			log.Warn("disconnected", "reason", reason(err))
		}),
		// The client calls this for every attempt that fails, the first
		// connection's too. Without it a Sentral that has never reached the
		// server says nothing about why.
		nats.ReconnectErrHandler(func(_ *nats.Conn, err error) {
			if why := reason(err); why != lastReason {
				lastReason = why
				log.Warn("cannot reach the server", "reason", why)
			}
		}),
		// Without a handler of its own the client writes its errors to
		// stderr itself, as plain text.
		nats.ErrorHandler(func(_ *nats.Conn, _ *nats.Subscription, err error) {
			log.Warn("client error", "reason", reason(err))
		}),
		nats.ClosedHandler(func(nc *nats.Conn) {
			c.connected.Store(false)
			log.Info("closed", "reason", reason(nc.LastError()))
			close(c.closed)
		}),
	}
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
