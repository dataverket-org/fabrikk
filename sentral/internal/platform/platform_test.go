// SPDX-License-Identifier: AGPL-3.0-or-later

package platform

import (
	"bytes"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"
)

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
