// SPDX-License-Identifier: AGPL-3.0-or-later

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"
)

// tenant is a tenant id, for the refusals that are about something else.
const tenant = "123e4567-e89b-42d3-a456-426614174000"

// The exit code is the contract with whoever runs the binary. These are the
// configurations and commands Sentral refuses before it starts anything; what
// a running Sentral and its probe answer is shown by the system tests.
func TestRun(t *testing.T) {
	t.Parallel()
	for _, test := range []struct {
		name string
		args []string
		env  map[string]string
		code int
		says string
	}{
		// The tenant is read first: with nothing set at all, it is the tenant
		// the one line names.
		{name: "no tenant", code: 2, says: "TENANT is not set"},
		{
			name: "a tenant that is not a tenant id",
			env:  map[string]string{"TENANT": "123E4567-E89B-42D3-A456-426614174000", "NATS_URL": "nats://127.0.0.1:4222"},
			code: 2, says: "TENANT is not a tenant id",
		},
		{name: "no server address", env: map[string]string{"TENANT": tenant}, code: 2, says: "NATS_URL"},
		{
			name: "a health address it cannot listen on",
			env:  map[string]string{"TENANT": tenant, "NATS_URL": "nats://127.0.0.1:4222", "HEALTH_ADDR": "nowhere"},
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
			// Whatever Sentral writes is one JSON object per line, and a refusal
			// is one line.
			lines := strings.Split(strings.TrimSpace(stderr.String()), "\n")
			if len(lines) != 1 {
				t.Errorf("a refusal is one line, got %d:\n%s", len(lines), stderr.String())
			}
			for _, line := range lines {
				var fields map[string]any
				if err := json.Unmarshal([]byte(line), &fields); err != nil {
					t.Errorf("a line on stderr is not one JSON object: %q", line)
				}
			}
		})
	}
}
