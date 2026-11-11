// SPDX-License-Identifier: AGPL-3.0-or-later

//go:build verify

package acceptance

import (
	"net/http"
	"os"
	"testing"
	"time"
)

// An operator can tell from outside whether Sentral is ready to serve. In a
// stack a container is healthy as soon as its process answers, so the test
// waits for readiness itself.
func TestSentralSaysItIsReady(t *testing.T) {
	address := os.Getenv("STACK_SENTRAL_8080")
	if address == "" {
		t.Fatal("STACK_SENTRAL_8080 is not set: this suite runs through task verify")
	}
	client := http.Client{Timeout: 2 * time.Second}
	status := func(path string) int {
		response, err := client.Get("http://" + address + path)
		if err != nil {
			return 0
		}
		response.Body.Close()
		return response.StatusCode
	}

	deadline := time.After(30 * time.Second)
	tick := time.NewTicker(100 * time.Millisecond)
	defer tick.Stop()
	for status("/readyz") != http.StatusOK {
		select {
		case <-deadline:
			t.Fatalf("/readyz did not answer 200 within the deadline; last answer %d", status("/readyz"))
		case <-tick.C:
		}
	}
	if got := status("/healthz"); got != http.StatusOK {
		t.Fatalf("/healthz: got %d, want 200", got)
	}
}
