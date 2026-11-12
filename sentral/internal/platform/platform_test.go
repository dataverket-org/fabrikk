// SPDX-License-Identifier: AGPL-3.0-or-later

package platform

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/nats-io/nats.go"
)

// lines is what a logger wrote, one decoded object for each line. A line that
// is not one JSON object fails the test: Sentral writes nothing else.
func lines(t *testing.T, logs *bytes.Buffer) []map[string]any {
	t.Helper()
	var decoded []map[string]any
	for _, line := range strings.Split(strings.TrimSpace(logs.String()), "\n") {
		if line == "" {
			continue
		}
		var fields map[string]any
		if err := json.Unmarshal([]byte(line), &fields); err != nil {
			t.Fatalf("a line is not one JSON object: %q", line)
		}
		decoded = append(decoded, fields)
	}
	return decoded
}

// told is what the client is told, applied the way the client applies it.
// Nothing connects: the test calls the client's callbacks itself.
func told(t *testing.T, logs *bytes.Buffer) nats.Options {
	t.Helper()
	c := &Connection{closed: make(chan struct{})}
	options := nats.GetDefaultOptions()
	for _, option := range c.options(slog.New(slog.NewJSONHandler(logs, nil))) {
		if err := option(&options); err != nil {
			t.Fatal(err)
		}
	}
	return options
}

// A server address Sentral cannot use is refused by the variable's name. Its
// value may carry a credential, so it is in neither the error nor the log.
func TestTheAddressIsNeverQuoted(t *testing.T) {
	t.Parallel()
	var logs bytes.Buffer
	_, err := Connect("nats://sentral:s3cret@127.0.0.1:42x2", slog.New(slog.NewJSONHandler(&logs, nil)))
	if err != ErrAddress {
		t.Fatalf("an address that cannot be parsed: got %v, want ErrAddress", err)
	}
	if strings.Contains(err.Error()+logs.String(), "s3cret") {
		t.Fatalf("the password is in the error or the log: %v\n%s", err, logs.String())
	}
}

// An attempt to reach the server that fails is logged with its reason, the
// first connection's too. The client tries again every two seconds, so an
// outage is one line for as long as its reason stays the same, and a
// connection in between makes the next outage a line again.
func TestAFailedAttemptIsLoggedWhenItsReasonChanges(t *testing.T) {
	t.Parallel()
	var logs bytes.Buffer
	client := told(t, &logs)
	if client.ReconnectErrCB == nil {
		t.Fatal("the client is given no handler for an attempt that fails")
	}
	refused, unknown := errors.New("connection refused"), errors.New("no such host")
	client.ReconnectErrCB(nil, refused)
	client.ReconnectErrCB(nil, refused)
	client.ReconnectErrCB(nil, unknown)
	client.ReconnectedCB(nil)
	client.ReconnectErrCB(nil, unknown)

	var reasons []any
	for _, line := range lines(t, &logs) {
		if line["msg"] != "cannot reach the server" {
			continue
		}
		if line["level"] != "WARN" {
			t.Errorf("a failed attempt is logged at %v, want WARN", line["level"])
		}
		reasons = append(reasons, line["reason"])
	}
	if want := []any{"connection refused", "no such host", "no such host"}; !reflect.DeepEqual(reasons, want) {
		t.Fatalf("the reasons logged: got %v, want %v", reasons, want)
	}
}

// Left without a handler the client writes its own errors to stderr, as plain
// text. It is given one that logs them.
func TestTheClientsErrorsGoThroughTheLogger(t *testing.T) {
	t.Parallel()
	var logs bytes.Buffer
	client := told(t, &logs)
	if client.AsyncErrorCB == nil {
		t.Fatal("the client is given no handler for its errors, so it writes them to stderr itself")
	}
	client.AsyncErrorCB(nil, nil, errors.New("slow consumer"))

	got := lines(t, &logs)
	if len(got) != 1 || got[0]["level"] != "WARN" || got[0]["msg"] != "client error" || got[0]["reason"] != "slow consumer" {
		t.Fatalf("a client error is logged as %v, want one WARN line saying client error, with the reason", got)
	}
}

// Left without an error log net/http writes its own errors to stderr, as
// plain text. The health server is given one that logs them.
func TestTheHealthServersErrorsGoThroughTheLogger(t *testing.T) {
	t.Parallel()
	var logs bytes.Buffer
	server := healthServer(func() bool { return true }, slog.New(slog.NewJSONHandler(&logs, nil)))
	if server.ErrorLog == nil {
		t.Fatal("the health server is given no error log, so net/http writes to stderr itself")
	}
	server.ErrorLog.Print("http: Accept error: too many open files")

	got := lines(t, &logs)
	if len(got) != 1 || got[0]["level"] != "WARN" || got[0]["msg"] != "http: Accept error: too many open files" {
		t.Fatalf("an error of the health server is logged as %v, want one WARN line with what it said", got)
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
