# Principles

*Part of [the story](README.md).* These hold for any product.

## Organisations govern themselves and share nothing

Each organisation decides its own organisation policy: who must be validated, what happens on departure, who may do what with what it holds, who may close it. The vocabulary it is written in is the system's, so a policy means the same at every provider and for every product, and a new product adds no word to it. An organisation always has at least one owner whose login is validated: that is the floor the system fixes, so that someone answers for the organisation; a user it allows without validation is answered for through its owners. Organisations share nothing, not even users: a login may have users in several, but what an organisation keeps of it is that it is validated, with the person id, and nothing else. The one deliberate exception is the person, the external identity that validation reveals, kept only so that the installation can recognise the same human again.

## Records are kept as long as the law requires

Audit records survive an organisation's deletion for the legally required period, then are deleted. An audit entry names a human by the person id, never by data that deletion removes and never by a login, so the entry stands after the person is gone and correlates with nothing at another installation; it carries no payload, so nothing an organisation governs itself with reaches the record. The external ID never leaves Person and is deleted when the last validated login tied to it is gone. Everything else is deleted with the organisation.

## An organisation is told of everything concerning what it holds

Every command and integration event about an organisation's things, its users and its terms reaches it three ways: as it happens, since every act on its things through the control plane crosses into its own account; through its audit view, its own copy of the record and the check that nothing was altered or dropped after (see [Audit](../map/audit.md)); and through notifications. No event on the board says "organisation informed": being told is a property of every event. How notifications are delivered is a design question.
