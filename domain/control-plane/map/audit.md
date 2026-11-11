# Audit

*Part of [the map](README.md).*

Audit is the record: who did what, when, to which thing. It is written once, never edited, kept for the legal period, and delivered as it happens to the organisation it concerns. It is unlike the other contexts, since it reads every command and integration event from every one of them and publishes almost nothing; that is a known shape, a supporting context, and the difference is itself a sign it is separate. There is one per provider, for its agreements and its products, and the installation is one: its Audit records the front desk, every organisation's agreement with it, which is the organisation's own lifecycle, its users, roles, policy and deletion, and every provider's own acts.

Evidence: the principle that audit trails survive the organisation's deletion; the datacenter operator's duties in the regulatory material, in the regulations' own sense of the word, to log everything, never edit the log, log who sees customer data, keep it, and deliver it when the customer asks; and a shared audit stream across providers as a possible federation, which only a context that already exists per provider can offer.

| Side | Holds | Events |
|---|---|---|
| **Audit** | Every command and integration event from every context as an entry, retention, delivery of the record to an organisation | Record closed, Retention period ended, Retained records deleted |

## Rules

- **One rule, with no clause for the installation.** A party's acts are recorded by the party it is accountable to; the installation, as the provider of the control plane, records every organisation's own lifecycle as any provider records its agreements'. Stated once in [the audit decision](../decisions/audit.md).
- An audit entry names the actor as admission established it, and a human by a stable identifier, never by data that deletion removes. What the identifier resolves to may be gone; the entry stands. The identifier is the person id the installation's Person minted, one across the installation, so an entry correlates with nothing at another installation, and two organisations' records naming it is the one correlation the installation keeps on purpose; for a user whose login is not validated, which an organisation policy may allow, it is the user id, kept after the organisation is deleted, and the organisation answers for the user through its owners.
- A fact that concerns several organisations is kept once per organisation, and each receives its own copy naming only itself, so none sees who the others were: [the integration contract](../decisions/integration-contract.md)'s rule.
- **An organisation's audit view is every entry about what it holds,** delivered into its account as it happens by the Audit that recorded it, under the rule stated once in [the audit decision](../decisions/audit.md). The organisation may keep it anywhere, outside the installation included, and nothing in it needs the installation to be read. The record is append-only, enforced by the installation, and a provider sits in an account it does not operate, so it cannot alter or drop an entry held above it. An entry never written is seen against the original in the organisation's own account: every provider act on the organisation's things through the control plane crosses into it as a command or an integration event, by the pin rule, so such an act can be hidden only by not being done. What never goes through the control plane is outside the record.
- An organisation sees every audit entry about what it holds, and is notified of them; there is no separate informing event.

## Crossings

| Crossing | Kind | Direction | What the receiving side does with it |
|---|---|---|---|
| Every command and integration event | Both | Every context to the Audit of the agreement its lifecycle belongs to: the installation's for the organisation's own, a provider's for the agreement's and its products' | Written as an entry; domain events inside an aggregate are not |
| *accept installation terms*, *validate*, *create organisation* | Command | The front desk to the installation's Audit, their envelopes and outcomes; the first two from an organisation's account likewise | Written as entries; *accept installation terms* is the first entry about a human who comes to the front desk |
| Organisation deleted | Event | Organisation to the installation's Audit | The last message an organisation's account carries, after the installation's *Agreement ended*. Once Audit holds it, the record of that organisation is complete: Audit publishes *Record closed* and starts the retention period. |
| Every command and integration event of a provider's own | Both | Each provider's contexts to the installation's Audit, across the provider's declared export | Written as an entry: a provider's acts are recorded by the installation, the party it is accountable to |
| Record closed | Event | The installation's Audit to Tenancy | Tenancy deletes the organisation's account. What has crossed into the installation's and the providers' accounts stays there whether the organisation's account exists or not, so once the record is complete nothing is lost with the account |
