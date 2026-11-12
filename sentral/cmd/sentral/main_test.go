// SPDX-License-Identifier: AGPL-3.0-or-later

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"
)

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
		{name: "no server address", code: 2, says: "NATS_URL"},
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
			// Whatever Sentral writes is one JSON object per line, a refusal too.
			for _, line := range strings.Split(strings.TrimSpace(stderr.String()), "\n") {
				var fields map[string]any
				if err := json.Unmarshal([]byte(line), &fields); err != nil {
					t.Errorf("a line on stderr is not one JSON object: %q", line)
				}
			}
		})
	}
}
