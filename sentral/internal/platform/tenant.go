// SPDX-License-Identifier: AGPL-3.0-or-later

package platform

import "errors"

// ErrTenantID is returned for anything that is not a tenant id. It never
// quotes what it was given.
var ErrTenantID = errors.New("not a tenant id: a UUID in its canonical lowercase spelling, and never the nil UUID")

// nilUUID is the UUID that names nothing.
const nilUUID = "00000000-0000-0000-0000-000000000000"

// TenantID is which tenant: the identity an instance is pinned to. Its
// spelling is decided in design/messaging.md, "The envelope". The empty value
// names no tenant, and ParseTenantID never returns it without an error.
//
// It lives here for as long as Sentral holds no context: the function that
// will compare a message's tenant with the pin is this package's. Where the
// identity lives once a context's domain needs it is that slice's question.
type TenantID struct{ spelling string }

// ParseTenantID reads a tenant id that came from outside as text, and is the
// only way to make one. It is not called New: nothing here mints an id, which
// is Tenancy's to do. It accepts one spelling and refuses every other, so a
// tenant is written the same way wherever two ids are compared.
func ParseTenantID(text string) (TenantID, error) {
	if len(text) != len(nilUUID) || text == nilUUID {
		return TenantID{}, ErrTenantID
	}
	for at := 0; at < len(text); at++ {
		digit := text[at]
		switch at {
		case 8, 13, 18, 23:
			if digit != '-' {
				return TenantID{}, ErrTenantID
			}
		default:
			if (digit < '0' || digit > '9') && (digit < 'a' || digit > 'f') {
				return TenantID{}, ErrTenantID
			}
		}
	}
	return TenantID{spelling: text}, nil
}

// String is the id's one spelling.
func (id TenantID) String() string { return id.spelling }

// MarshalText is the same spelling for whatever encodes the id, the log
// among them: without it an encoder would write a struct with nothing in it.
func (id TenantID) MarshalText() ([]byte, error) { return []byte(id.spelling), nil }
