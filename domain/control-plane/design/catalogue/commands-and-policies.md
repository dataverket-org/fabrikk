# Commands and policies

*Part of [Catalogue's design](README.md).* Taken together because Catalogue has one policy. A command is what a service or a human asks Catalogue to do; a policy is Catalogue reacting to a fact with no one asking. Every command crosses from a provider's account into the installation's and is audited there, so every announcement, every publication of terms and every withdrawal is an entry in the installation's record of the provider's acts; its payload, the announcement and the terms' text, is Catalogue's and never the record's. The installation's own commands, for the control plane, arrive inside the installation's account rather than across an export, and are audited in the same record, which is the installation's record of its own acts.

## Commands

| Command | Who sends it | Rules | Event behind it |
|---|---|---|---|
| *announce* | The instance a provider runs for a product, the first time and again whenever anything it says changes, availability among it | Carries the announcement whole: the product's name; its items with where each is offered and what can be had now; its quota counts with a default each; and the class of each command. The provider is the account the command arrived from; an announcement naming another is refused. Creates the listing, or replaces the announcement whole; a withdrawn listing is listed again by it. Refused when it drops a count or a class the listing already names, since quotas and organisation policies are written in them; refused for a default below zero or a class not among the four. The control plane's listing is a given, and no *announce* is sent for it | Product announced |
| *publish terms* | The provider's operator, for one of its products, carrying the terms' text, a label and, when the product has terms already, an effective date; the installation's operator for the control plane, from inside the installation's account | Refused unless the listing exists under the provider the command arrived from. The first terms are current at once; later terms carry an effective date after the day of publication, are listed as pending until it, and replace pending terms already listed. Pending terms are never withdrawn: a change of mind publishes the current text again. Each publication has an identity, which *accept terms* and *accept installation terms* name. Allowed on a withdrawn listing | Terms published, the first time; New terms published after |
| *withdraw product* | The provider's operator duty, for one of its products | Refused unless the listing exists under the provider the command arrived from. Marks the listing withdrawn: read by no *accept terms* that takes the product, readable still by those that hold it, so that *set quota*, *set policy* and new terms for it still work; nothing else changes, and nothing of what any organisation holds is touched. A withdrawn listing is withdrawn again by nothing | Product withdrawn |

## Policies

| Whenever | Catalogue does |
|---|---|
| The effective date of a listing's pending terms passes | Makes the pending terms the current ones and lists the old no more: from then on *accept terms* can name only the new, and an organisation that had not accepted them has let its terms expire, which is Organisation's own reaction to the same date. Catalogue's one reaction to the clock, held as the date on the listing so a restart loses nothing; *Terms took effect* is its domain event |

Nothing else moves Catalogue. It knows no organisation and no agreement: who holds a product is Organisation's fact, and a catalogue fact is published once and read by all. The control plane is a listing like any other, and Catalogue has no rule of its own for it.
