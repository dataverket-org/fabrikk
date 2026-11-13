// SPDX-License-Identifier: AGPL-3.0-or-later

//go:build verify

package acceptance

import (
	"net/http"
	"testing"
)

// An operator can see which tenant a Sentral serves: started with a tenant,
// its log says which, and it is the one the manifest gives it. The line is
// written each time Sentral starts, so the whole log is looked at.
func TestSentralSaysWhichTenantItServes(t *testing.T) {
	answers(t, "/readyz", http.StatusOK)
	want := given(t, "TENANT")

	eventually(t, "the log has an INFO line saying pinned, with the tenant "+want, func() bool {
		for _, one := range written(t) {
			if one.Level == "INFO" && one.Msg == "pinned" && one.Tenant == want {
				return true
			}
		}
		return false
	})
}
