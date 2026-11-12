// SPDX-License-Identifier: AGPL-3.0-or-later

//go:build verify

package acceptance

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"testing"
	"time"
)

// What the suite does to its stack, and nothing else: it asks Sentral's
// health port from outside, and it does to the stack's pods what a cluster's
// runtime does to a pod. It stops and starts one, runs the probe commands the
// manifest declares, and reads a container's state and its log.

// setting is a variable task verify gives the suite.
func setting(t *testing.T, name string) string {
	t.Helper()
	value := os.Getenv(name)
	if value == "" {
		t.Fatalf("%s is not set: this suite runs through task verify", name)
	}
	return value
}

// The server's pod is a fragment's: <stack>-<its name>. Sentral ships a
// Deployment, whose pod podman names <stack>-<name>-pod, and a container in
// it <pod>-<container>.
func serverPod(t *testing.T) string  { return setting(t, "STACK") + "-nats" }
func sentralPod(t *testing.T) string { return setting(t, "STACK") + "-sentral-pod" }
func sentral(t *testing.T) string    { return sentralPod(t) + "-sentral" }

// status is what Sentral's health port answers for path, or 0 when it gives
// no answer. Each question uses a connection of its own, so none is left
// open on the port to hold up a stop.
func status(t *testing.T, path string) int {
	t.Helper()
	client := http.Client{Timeout: 2 * time.Second, Transport: &http.Transport{DisableKeepAlives: true}}
	response, err := client.Get("http://" + setting(t, "STACK_SENTRAL_8080") + path)
	if err != nil {
		return 0
	}
	response.Body.Close()
	return response.StatusCode
}

// eventually polls until what holds, and fails the test at the deadline.
func eventually(t *testing.T, what string, holds func() bool) {
	t.Helper()
	deadline := time.After(30 * time.Second)
	tick := time.NewTicker(100 * time.Millisecond)
	defer tick.Stop()
	for !holds() {
		select {
		case <-deadline:
			t.Fatalf("not within the deadline: %s", what)
		case <-tick.C:
		}
	}
}

// answers waits until path answers want.
func answers(t *testing.T, path string, want int) {
	t.Helper()
	eventually(t, path+" answers "+http.StatusText(want), func() bool { return status(t, path) == want })
}

// podman runs podman and hands back what it printed and its exit code. Only
// a podman that could not be run at all fails the test here.
func podman(t *testing.T, args ...string) (string, int) {
	t.Helper()
	var printed bytes.Buffer
	command := exec.Command("podman", args...)
	command.Stdout, command.Stderr = &printed, &printed
	err := command.Run()
	var exit *exec.ExitError
	if err != nil && !errors.As(err, &exit) {
		t.Fatalf("podman %s: %v", strings.Join(args, " "), err)
	}
	return strings.TrimSpace(printed.String()), command.ProcessState.ExitCode()
}

// stop stops a pod of the stack. It is started again when the test ends,
// however it ends, so the next test finds every pod running.
func stop(t *testing.T, pod string) {
	t.Helper()
	t.Cleanup(func() {
		if printed, code := podman(t, "pod", "start", pod); code != 0 {
			t.Errorf("%s did not start again: %s", pod, printed)
		}
	})
	if printed, code := podman(t, "pod", "stop", pod); code != 0 {
		t.Fatalf("%s did not stop: %s", pod, printed)
	}
}

// start starts a pod the test stopped.
func start(t *testing.T, pod string) {
	t.Helper()
	if printed, code := podman(t, "pod", "start", pod); code != 0 {
		t.Fatalf("%s did not start: %s", pod, printed)
	}
}

// state is Sentral's container as podman sees it: "running 0", "exited 0".
func state(t *testing.T) string {
	t.Helper()
	printed, code := podman(t, "inspect", "--format", "{{.State.Status}} {{.State.ExitCode}}", sentral(t))
	if code != 0 {
		t.Fatalf("Sentral's container %s was not found: %s", sentral(t), printed)
	}
	return printed
}

// probe is the command the manifest declares for a probe, which is what a
// cluster runs in the container. The manifest writes it as a flow sequence,
// and that is JSON.
func probe(t *testing.T, name string) []string {
	t.Helper()
	manifest, err := os.ReadFile("../deploy/base/sentral.yaml")
	if err != nil {
		t.Fatal(err)
	}
	_, after, found := strings.Cut(string(manifest), name+":")
	if found {
		_, after, found = strings.Cut(after, "command:")
	}
	line, _, _ := strings.Cut(after, "\n")
	var command []string
	if !found || json.Unmarshal([]byte(line), &command) != nil || len(command) == 0 {
		t.Fatalf("the manifest declares no exec command for %s", name)
	}
	return command
}

// given is the value the manifest gives Sentral for a variable of its
// environment, which is written on the line after the variable's name.
func given(t *testing.T, name string) string {
	t.Helper()
	manifest, err := os.ReadFile("../deploy/base/sentral.yaml")
	if err != nil {
		t.Fatal(err)
	}
	_, after, found := strings.Cut(string(manifest), "- name: "+name+"\n")
	line, _, _ := strings.Cut(after, "\n")
	value, isValue := strings.CutPrefix(strings.TrimSpace(line), "value: ")
	if !found || !isValue || value == "" {
		t.Fatalf("the manifest gives Sentral no %s", name)
	}
	return value
}

// asked runs a probe command in Sentral's container and hands back its exit
// code, which is all a cluster reads of it.
func asked(t *testing.T, command []string) int {
	t.Helper()
	_, code := podman(t, append([]string{"exec", sentral(t)}, command...)...)
	return code
}

// entry is one line of Sentral's log.
type entry struct {
	Level  string `json:"level"`
	Msg    string `json:"msg"`
	Reason string `json:"reason"`
	Tenant string `json:"tenant"`
}

// written is every line Sentral's container has written, oldest first: what
// an operator reads, and what a cluster collects. The log outlives a stop and
// a start, so a test that looks for a line notes how many there were before
// it acted and looks only at those after. Every line has to be one JSON
// object with a time, a level and a message, and any that is not fails the
// test that read it.
func written(t *testing.T) []entry {
	t.Helper()
	printed, code := podman(t, "logs", sentral(t))
	if code != 0 {
		t.Fatalf("the log of %s could not be read: %s", sentral(t), printed)
	}
	var entries []entry
	for _, line := range strings.Split(printed, "\n") {
		if line == "" {
			continue
		}
		var fields map[string]any
		if err := json.Unmarshal([]byte(line), &fields); err != nil {
			t.Fatalf("a line of Sentral's log is not one JSON object: %q", line)
		}
		for _, field := range []string{"time", "level", "msg"} {
			if text, _ := fields[field].(string); text == "" {
				t.Fatalf("a line of Sentral's log has no %s: %q", field, line)
			}
		}
		var one entry
		if err := json.Unmarshal([]byte(line), &one); err != nil {
			t.Fatalf("a line of Sentral's log does not read as a log line: %q", line)
		}
		entries = append(entries, one)
	}
	return entries
}

// says waits until Sentral's log, past its first lines, has one at level
// with msg.
func says(t *testing.T, past int, level, msg string) {
	t.Helper()
	eventually(t, "the log has a "+level+" line saying "+msg, func() bool {
		for _, one := range written(t)[past:] {
			if one.Level == level && one.Msg == msg {
				return true
			}
		}
		return false
	})
}

// saysWhy is says for a line that also carries a reason. What the reason says
// is the client's or the system's to word, and is not asserted.
func saysWhy(t *testing.T, past int, level, msg string) {
	t.Helper()
	eventually(t, "the log has a "+level+" line saying "+msg+", with a reason", func() bool {
		for _, one := range written(t)[past:] {
			if one.Level == level && one.Msg == msg && one.Reason != "" {
				return true
			}
		}
		return false
	})
}
