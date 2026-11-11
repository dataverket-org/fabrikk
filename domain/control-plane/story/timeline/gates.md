# Rules: the gates

*Part of [the timeline](README.md).* What must have happened before an event may; the full rule behind each is in the design page linked. A product has gates of its own on the journey of what it delivers.

| Gate | Must have happened first |
|---|---|
| Before *Installation terms accepted* | A login at the front desk or a user of it in an organisation; the installation's current terms listed. Once per login |
| Before *Login validated* | *Installation terms accepted*, current; a means of validation the installation's policy names |
| Before *Organisation created* | *Login validated*; *Installation terms accepted*, current; the person an owner in fewer organisations than the installation's limit. [Tenancy's command](../../design/tenancy/commands-and-policies.md) |
| Before *Terms accepted* | Organisation created; the product listed under the provider with those terms, current or pending, and not withdrawn; the product not offboarding. [Organisation's commands](../../design/organisation/commands.md) |
| Before *Agreement activated* | *Terms accepted*; every condition for activation the provider's policy names met. [Organisation's policies](../../design/organisation/policies.md) |
| Before *approve agreement* | The agreement held; the operator duty |
| Before *Role granted to user*, owner | The user's login validated. Any other role to any user |
| Before a role applies | The login validated, where the organisation policy requires it for that role |
| Before *Role revoked from user*, *User disabled* or *User deleted* | Not the last enabled owner |
| Before a product accepts an ask | *Agreement activated*; the terms current; within the quota, counting held and reserved |
| Before *Quota set* | The product held; the operator duty |
| Before *New terms published* | Current terms listed; the effective date after the day of publication |
| Before *Terms expired* | New terms published; the effective date passed with no acceptance |
| Before *Product withdrawn* | The product listed under the provider |
| Before *Offboarding requested*, by the operator | With reason declined: a condition for activation unmet. Dormancy: no agreement but the installation's held for the dormancy period. Terms expired: *Terms expired*. Product withdrawn: *Product withdrawn*, and the product held |
| Before *Offboarding requested*, by an owner | The product held and not offboarding; for the installation's agreement, no other agreement standing, and the organisation policy's closing rule met |
| Before *Offboarding withdrawn* | A pending request of the owner's own, not yet complete |
| Before *Offboarding lapsed* | The installation's dormancy offboarding running, and *Terms accepted* at a provider meanwhile |
| Before a product ends what is still held | *Offboarding requested* naming it, and the terms' notice passed |
| Before *Organisation cleared* | *Offboarding requested* naming the product or its agreement; nothing held, nothing reserved |
| Before *Terms ended* | *Organisation cleared*; for the control plane, the owners' request complete or the operator's notice passed; for an agreement declined, the operator's request alone |
| Before *Terms accepted* for a product whose terms ended | *Terms ended*; the product listed; the agreement standing. The product starts over |
| Before *Agreement ended* | Offboarding requested for the agreement, and *Terms ended* for every product |
| Before *Organisation deleted* | The installation's *Agreement ended*, always the last |
| Before *Visitor dropped* | The dormancy period for visitors passed with the login in no organisation |
