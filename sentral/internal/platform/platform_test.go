// SPDX-License-Identifier: AGPL-3.0-or-later

package platform

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// How the stand-in behaves.
const (
	answer int32 = iota // greet, and answer every ping
	refuse              // accept, count, close: a server that cannot be reached
	quiet               // stop answering, keep the socket open, greet no one
	reject              // greet, then refuse the client's authorization
)

// standIn is a peer that speaks the few lines of the server's protocol a
// client needs, on one port it keeps bound, and behaves as it is told.
type standIn struct {
	listener net.Listener
	mode     atomic.Int32
	refused  atomic.Int64

	mu    sync.Mutex
	conns map[net.Conn]struct{}
}

func newStandIn(t *testing.T, mode int32) *standIn {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	s := &standIn{listener: listener, conns: map[net.Conn]struct{}{}}
	s.mode.Store(mode)
	go s.accept()
	t.Cleanup(func() {
		listener.Close()
		s.drop()
	})
	return s
}

func (s *standIn) address() string { return "nats://" + s.listener.Addr().String() }

// become changes the behaviour. Refusing also drops the connections it has.
func (s *standIn) become(mode int32) {
	s.mode.Store(mode)
	if mode == refuse {
		s.drop()
	}
}

func (s *standIn) drop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for conn := range s.conns {
		conn.Close()
		delete(s.conns, conn)
	}
}

func (s *standIn) accept() {
	for {
		conn, err := s.listener.Accept()
		if err != nil {
			return
		}
		if s.mode.Load() == refuse {
			s.refused.Add(1)
			conn.Close()
			continue
		}
		s.mu.Lock()
		s.conns[conn] = struct{}{}
		s.mu.Unlock()
		go s.serve(conn)
	}
}

func (s *standIn) serve(conn net.Conn) {
	defer conn.Close()
	if s.mode.Load() == quiet {
		io.Copy(io.Discard, conn)
		return
	}
	fmt.Fprint(conn, `INFO {"server_id":"standin","version":"2.10.0","proto":1,"max_payload":1048576}`+"\r\n")
	lines := bufio.NewScanner(conn)
	for lines.Scan() {
		line, mode := lines.Text(), s.mode.Load()
		switch {
		case strings.HasPrefix(line, "CONNECT") && mode == reject:
			fmt.Fprint(conn, "-ERR 'Authorization Violation'\r\n")
			return
		case strings.HasPrefix(line, "PING") && mode == answer:
			fmt.Fprint(conn, "PONG\r\n")
		}
	}
}

// logBuffer is a log destination the test can read while Sentral writes.
type logBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *logBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *logBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// fast is the client's patience in tests: milliseconds where production
// waits seconds.
var fast = timing{ping: 20 * time.Millisecond, reconnectWait: 10 * time.Millisecond, dial: 100 * time.Millisecond}

// sentral is a running Sentral: Run over a connection to address.
type sentral struct {
	health string
	stop   context.CancelFunc
	done   chan error
	logs   *logBuffer
}

func start(t *testing.T, address string) *sentral {
	t.Helper()
	return startWith(t, address, fast)
}

func startWith(t *testing.T, address string, patience timing) *sentral {
	t.Helper()
	logs := &logBuffer{}
	log := slog.New(slog.NewJSONHandler(logs, nil))
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	conn, err := connect(address, log, patience)
	if err != nil {
		t.Fatal(err)
	}
	ctx, stop := context.WithCancel(context.Background())
	s := &sentral{health: listener.Addr().String(), stop: stop, done: make(chan error, 1), logs: logs}
	go func() { s.done <- Run(ctx, conn, listener, log) }()
	t.Cleanup(stop)
	return s
}

// status is the answer of the health port for path, or 0 when it gives none.
// Each question uses a connection of its own, so none is left open on the
// port: a stop waits for a connection that has not asked anything yet.
func (s *sentral) status(path string) int {
	client := http.Client{Timeout: time.Second, Transport: &http.Transport{DisableKeepAlives: true}}
	response, err := client.Get("http://" + s.health + path)
	if err != nil {
		return 0
	}
	response.Body.Close()
	return response.StatusCode
}

// stopped waits for Run to return and hands back what it returned.
func (s *sentral) stopped(t *testing.T) error {
	t.Helper()
	select {
	case err := <-s.done:
		return err
	case <-time.After(shutdownGrace + 2*time.Second):
		t.Fatal("Run did not return within its deadline")
		return nil
	}
}

// eventually polls until what holds, and fails the test at the deadline.
func eventually(t *testing.T, what string, holds func() bool) {
	t.Helper()
	deadline := time.After(5 * time.Second)
	tick := time.NewTicker(5 * time.Millisecond)
	defer tick.Stop()
	for !holds() {
		select {
		case <-deadline:
			t.Fatalf("not within the deadline: %s", what)
		case <-tick.C:
		}
	}
}

func refuses(address string) bool {
	conn, err := net.DialTimeout("tcp", address, time.Second)
	if err != nil {
		return true
	}
	conn.Close()
	return false
}

func TestReadyOnlyWhileConnected(t *testing.T) {
	t.Parallel()
	peer := newStandIn(t, refuse)
	s := start(t, peer.address())

	eventually(t, "/healthz answers 200", func() bool { return s.status("/healthz") == 200 })
	if got := s.status("/readyz"); got != 503 {
		t.Fatalf("/readyz before the first connection: got %d, want 503", got)
	}

	peer.become(answer)
	eventually(t, "/readyz is 200 once connected", func() bool { return s.status("/readyz") == 200 })

	peer.become(refuse)
	eventually(t, "/readyz is 503 after the connection is lost", func() bool { return s.status("/readyz") == 503 })

	// The client's own limit is 60 attempts. Sentral must outlast it.
	before := peer.refused.Load()
	eventually(t, "more than 60 refused attempts", func() bool { return peer.refused.Load() > before+60 })
	if got := s.status("/healthz"); got != 200 {
		t.Fatalf("/healthz while the server is away: got %d, want 200", got)
	}

	peer.become(answer)
	eventually(t, "/readyz is 200 again when the server is back", func() bool { return s.status("/readyz") == 200 })
}

func TestNotReadyWhenTheServerGoesQuiet(t *testing.T) {
	t.Parallel()
	peer := newStandIn(t, answer)
	// Each attempt to reach a server that says nothing takes the client two
	// seconds here, and it holds its lock for as long.
	patient := timing{ping: fast.ping, reconnectWait: fast.reconnectWait, dial: 2 * time.Second}
	s := startWith(t, peer.address(), patient)
	eventually(t, "/readyz is 200 once connected", func() bool { return s.status("/readyz") == 200 })

	// The socket stays open, so only the ping can notice.
	peer.become(quiet)
	eventually(t, "/readyz is 503 after the server goes quiet", func() bool { return s.status("/readyz") == 503 })

	// And it answers at once, every time, while the client is busy waiting.
	for range 20 {
		asked := time.Now()
		if got := s.status("/readyz"); got != 503 {
			t.Fatalf("/readyz while the server is quiet: got %d, want 503", got)
		}
		if took := time.Since(asked); took > 500*time.Millisecond {
			t.Fatalf("/readyz took %s while the server is quiet", took)
		}
	}
}

func TestStopsCleanly(t *testing.T) {
	t.Parallel()
	for name, mode := range map[string]int32{"while connected": answer, "while the server is away": refuse} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			peer := newStandIn(t, mode)
			s := start(t, peer.address())
			want := 200
			if mode == refuse {
				want = 503
			}
			eventually(t, "/readyz answers", func() bool { return s.status("/readyz") == want })

			s.stop()
			if err := s.stopped(t); err != nil {
				t.Fatalf("Run returned %v after a stop, want nil", err)
			}
			if !refuses(s.health) {
				t.Fatal("the health port still accepts connections after a stop")
			}
			if logs := s.logs.String(); !strings.Contains(logs, `"msg":"closed"`) {
				t.Fatalf("the closed line was not logged before Run returned:\n%s", logs)
			}
		})
	}
}

func TestGivesUpWhenTheServerRejectsIt(t *testing.T) {
	t.Parallel()
	peer := newStandIn(t, reject)
	s := start(t, peer.address())

	err := s.stopped(t)
	if err == nil || !strings.Contains(err.Error(), "Authorization Violation") {
		t.Fatalf("Run returned %v, want the server's reason", err)
	}
	if !refuses(s.health) {
		t.Fatal("the health port still accepts connections after the client gave up")
	}
}

func TestProbe(t *testing.T) {
	t.Parallel()
	ctx := context.Background()
	peer := newStandIn(t, refuse)
	s := start(t, peer.address())
	eventually(t, "/healthz answers 200", func() bool { return s.status("/healthz") == 200 })

	if err := Probe(ctx, s.health, "/readyz"); err == nil {
		t.Fatal("a probe of readiness passed against a Sentral that is not ready")
	}
	if err := Probe(ctx, s.health, "/healthz"); err != nil {
		t.Fatalf("a probe of liveness failed against a running Sentral: %v", err)
	}

	peer.become(answer)
	eventually(t, "a probe of readiness passes once connected", func() bool {
		return Probe(ctx, s.health, "/readyz") == nil
	})

	s.stop()
	s.stopped(t)
	if err := Probe(ctx, s.health, "/readyz"); err == nil {
		t.Fatal("a probe passed against a closed port")
	}
}

func TestTheAddressIsNeverQuoted(t *testing.T) {
	t.Parallel()
	logs := &logBuffer{}
	_, err := connect("nats://sentral:s3cret@127.0.0.1:42x2", slog.New(slog.NewJSONHandler(logs, nil)), fast)
	if err != ErrAddress {
		t.Fatalf("an address that cannot be parsed: got %v, want ErrAddress", err)
	}
	if strings.Contains(err.Error()+logs.String(), "s3cret") {
		t.Fatalf("the password is in the error or the log: %v\n%s", err, logs)
	}

	peer := newStandIn(t, answer)
	s := start(t, "nats://sentral:s3cret@"+peer.listener.Addr().String())
	eventually(t, "/readyz is 200 once connected", func() bool { return s.status("/readyz") == 200 })
	s.stop()
	s.stopped(t)

	written := s.logs.String()
	for _, line := range []string{`"msg":"connected"`, `"msg":"stopping"`, `"msg":"closed"`} {
		if !strings.Contains(written, line) {
			t.Errorf("the log has no %s line:\n%s", line, written)
		}
	}
	if strings.Contains(written, "s3cret") {
		t.Fatalf("the password is in the log:\n%s", written)
	}
}

func TestHandler(t *testing.T) {
	t.Parallel()
	for _, test := range []struct {
		path  string
		ready bool
		want  int
	}{
		{"/healthz", true, 200},
		{"/healthz", false, 200},
		{"/readyz", true, 200},
		{"/readyz", false, 503},
		{"/", true, 404},
	} {
		recorder := httptest.NewRecorder()
		Handler(func() bool { return test.ready }).ServeHTTP(recorder, httptest.NewRequest("GET", test.path, nil))
		if recorder.Code != test.want {
			t.Errorf("%s with ready=%t: got %d, want %d", test.path, test.ready, recorder.Code, test.want)
		}
	}
}
