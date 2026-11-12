// SPDX-License-Identifier: AGPL-3.0-or-later

package platform

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"testing"
)

const aTenant = "123e4567-e89b-42d3-a456-426614174000"

// A tenant id has one spelling. Every row that is refused is close to it in
// one way, so a check that forgets that way lets the row through.
func TestParseTenantID(t *testing.T) {
	t.Parallel()
	for _, test := range []struct {
		name    string
		text    string
		refused bool
	}{
		{name: "the canonical lowercase spelling", text: aTenant},
		{name: "nothing", text: "", refused: true},
		{name: "uppercase", text: "123E4567-E89B-42D3-A456-426614174000", refused: true},
		{name: "one uppercase digit", text: "123e4567-e89b-42d3-a456-42661417400A", refused: true},
		{name: "braces", text: "{" + aTenant + "}", refused: true},
		{name: "a urn prefix", text: "urn:uuid:" + aTenant, refused: true},
		{name: "no hyphens", text: "123e4567e89b42d3a456426614174000", refused: true},
		{name: "a hyphen one place off", text: "123e4567e-89b-42d3-a456-426614174000", refused: true},
		{name: "a hyphen where a digit goes", text: "123e4567-e89b-42d3-a456-42661417-000", refused: true},
		{name: "one digit short", text: "123e4567-e89b-42d3-a456-42661417400", refused: true},
		{name: "one digit long", text: aTenant + "0", refused: true},
		{name: "a trailing newline", text: aTenant + "\n", refused: true},
		{name: "a digit that is not hexadecimal", text: "123e4567-e89b-42d3-a456-42661417400g", refused: true},
		{name: "the nil UUID", text: nilUUID, refused: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			id, err := ParseTenantID(test.text)
			if test.refused {
				if !errors.Is(err, ErrTenantID) {
					t.Errorf("ParseTenantID(%q): got %v, want ErrTenantID", test.text, err)
				}
				if id != (TenantID{}) {
					t.Errorf("ParseTenantID(%q) refused it and still returned %q", test.text, id)
				}
				return
			}
			if err != nil {
				t.Fatalf("ParseTenantID(%q): %v", test.text, err)
			}
			if id.String() != test.text {
				t.Errorf("String(): got %q, want %q", id, test.text)
			}
		})
	}
}

// The log writes a tenant id as its spelling. A struct with no exported
// field would otherwise be written as an empty object.
func TestTenantIDIsLoggedAsItsSpelling(t *testing.T) {
	t.Parallel()
	id, err := ParseTenantID(aTenant)
	if err != nil {
		t.Fatal(err)
	}
	var logs bytes.Buffer
	slog.New(slog.NewJSONHandler(&logs, nil)).Info("pinned", "tenant", id)

	var line struct {
		Tenant string `json:"tenant"`
	}
	if err := json.Unmarshal(logs.Bytes(), &line); err != nil {
		t.Fatalf("the line does not carry the tenant as text: %v\n%s", err, logs.String())
	}
	if line.Tenant != aTenant {
		t.Errorf("tenant: got %q, want %q", line.Tenant, aTenant)
	}
}
