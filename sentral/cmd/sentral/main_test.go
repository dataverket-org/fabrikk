// SPDX-License-Identifier: AGPL-3.0-or-later

package main

import (
	"bytes"
	"context"
	"net/http/httptest"
	"strings"
	"testing"

	"git.dataverket.org/dataverket/fabrikk/sentral/internal/platform"
)

// The exit code is the contract with whoever runs the binary: a kubelet
// running the probe, an operator starting Sentral.
func TestRun(t *testing.T) {
	t.Parallel()
	health := func(ready bool) string {
		server := httptest.NewServer(platform.Handler(func() bool { return ready }))
		t.Cleanup(server.Close)
		return server.Listener.Addr().String()
	}
	ready, notReady := health(true), health(false)

	for _, test := range []struct {
		name   string
		args   []string
		env    map[string]string
		code   int
		says   string
		unsaid string
	}{
		{name: "a probe of a ready Sentral", args: []string{"probe"}, env: map[string]string{"HEALTH_ADDR": ready}, code: 0},
		{name: "a probe of one that is not ready", args: []string{"probe"}, env: map[string]string{"HEALTH_ADDR": notReady}, code: 1, says: "/readyz"},
		{name: "a probe of liveness while not ready", args: []string{"probe", "/healthz"}, env: map[string]string{"HEALTH_ADDR": notReady}, code: 0},
		{name: "no server address", code: 2, says: "NATS_URL"},
		{
			name: "a server address it cannot use",
			env:  map[string]string{"NATS_URL": "nats://sentral:s3cret@127.0.0.1:42x2", "HEALTH_ADDR": "127.0.0.1:0"},
			code: 2, says: "NATS_URL", unsaid: "s3cret",
		},
		{
			name: "a health address it cannot listen on",
			env:  map[string]string{"NATS_URL": "nats://127.0.0.1:4222", "HEALTH_ADDR": "nowhere"},
			code: 2, says: "HEALTH_ADDR",
		},
		{name: "a command it does not know", args: []string{"serve"}, code: 2, says: "usage"},
	} {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			var stderr bytes.Buffer
			code := run(context.Background(), test.args, func(key string) string { return test.env[key] }, &stderr)
			if code != test.code {
				t.Errorf("exit code %d, want %d\n%s", code, test.code, stderr.String())
			}
			if !strings.Contains(stderr.String(), test.says) {
				t.Errorf("stderr does not say %q:\n%s", test.says, stderr.String())
			}
			if test.unsaid != "" && strings.Contains(stderr.String(), test.unsaid) {
				t.Errorf("stderr says %q:\n%s", test.unsaid, stderr.String())
			}
		})
	}
}
