// SPDX-License-Identifier: AGPL-3.0-or-later

// Package acceptance is Sentral's black-box suite. task verify runs it from
// outside the verify stack, against the image built from the commit; its
// tests are behind the build tag verify. It is a module of its own, with a
// path outside Sentral's, so it cannot import any of Sentral's packages.
package acceptance
