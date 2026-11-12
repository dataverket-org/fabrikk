// SPDX-License-Identifier: AGPL-3.0-or-later

//go:build verify

package acceptance

import (
	"net/http"
	"testing"
)

// Each test first waits for a ready Sentral and leaves every pod running, so
// the order they run in does not matter. None runs in parallel: they share
// the one stack.

// An operator can tell from outside whether Sentral is ready to serve. In a
// stack a container is healthy as soon as its process answers, so the test
// waits for readiness itself.
func TestSentralSaysItIsReady(t *testing.T) {
	answers(t, "/readyz", http.StatusOK)
	if got := status(t, "/healthz"); got != http.StatusOK {
		t.Fatalf("/healthz: got %d, want 200", got)
	}
}

// While the server is gone Sentral says it is not ready and stays up, and it
// is ready again when the server is back. Its log says both, the first with
// the reason.
func TestSentralIsNotReadyWhileTheServerIsGone(t *testing.T) {
	answers(t, "/readyz", http.StatusOK)
	before := len(written(t))

	stop(t, serverPod(t))
	answers(t, "/readyz", http.StatusServiceUnavailable)
	if got := status(t, "/healthz"); got != http.StatusOK {
		t.Fatalf("/healthz while the server is gone: got %d, want 200", got)
	}
	saysWhy(t, before, "WARN", "disconnected")

	start(t, serverPod(t))
	answers(t, "/readyz", http.StatusOK)
	says(t, before, "INFO", "reconnected")
}

// A cluster does not ask the health port: it runs the probe commands the
// manifest declares and acts on their exit codes. Readiness follows the
// connection; liveness does not, or a cluster would restart Sentral whenever
// the server is away.
func TestTheProbesAnswerByTheirExitCode(t *testing.T) {
	readiness, liveness := probe(t, "readinessProbe"), probe(t, "livenessProbe")
	answers(t, "/readyz", http.StatusOK)
	if got := asked(t, readiness); got != 0 {
		t.Fatalf("the readiness probe of a ready Sentral: exit code %d, want 0", got)
	}
	if got := asked(t, liveness); got != 0 {
		t.Fatalf("the liveness probe of a ready Sentral: exit code %d, want 0", got)
	}

	stop(t, serverPod(t))
	answers(t, "/readyz", http.StatusServiceUnavailable)
	if got := asked(t, readiness); got != 1 {
		t.Fatalf("the readiness probe while the server is gone: exit code %d, want 1", got)
	}
	if got := asked(t, liveness); got != 0 {
		t.Fatalf("the liveness probe while the server is gone: exit code %d, want 0", got)
	}
}

// Asked to stop, Sentral exits 0, which is how a cluster tells a stop from a
// failure.
func TestSentralStopsCleanly(t *testing.T) {
	answers(t, "/readyz", http.StatusOK)

	stop(t, sentralPod(t))
	if got := state(t); got != "exited 0" {
		t.Fatalf("Sentral's container after a stop: %s, want exited 0", got)
	}
}

// Sentral does not need the server to be there first. Started while the
// server is away it stays up, not ready, and its log says why; it becomes
// ready when the server comes; and it stops as cleanly then as when connected.
func TestSentralStartsAndStopsWhileTheServerIsAway(t *testing.T) {
	answers(t, "/readyz", http.StatusOK)
	stop(t, serverPod(t))
	answers(t, "/readyz", http.StatusServiceUnavailable)

	stop(t, sentralPod(t))
	if got := state(t); got != "exited 0" {
		t.Fatalf("Sentral's container after a stop while the server is away: %s, want exited 0", got)
	}

	// Counted here, between the stop and the start: the Sentral that was
	// stopped had lost its server too, and what it wrote is not what this
	// shows. The one started now has never reached the server.
	before := len(written(t))
	start(t, sentralPod(t))
	answers(t, "/healthz", http.StatusOK)
	if got := status(t, "/readyz"); got != http.StatusServiceUnavailable {
		t.Fatalf("/readyz of a Sentral started while the server is away: got %d, want 503", got)
	}
	saysWhy(t, before, "WARN", "cannot reach the server")

	start(t, serverPod(t))
	answers(t, "/readyz", http.StatusOK)
	if got := state(t); got != "running 0" {
		t.Fatalf("Sentral's container once the server came: %s, want running 0", got)
	}
}
