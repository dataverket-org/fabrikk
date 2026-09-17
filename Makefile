# fabrikk monorepo. Protected path: verification and release run these targets.
# Dev-environment targets (dev.up, check, verify, ...) arrive with the first product; see the dev-environment skill.

SHELL := bash
.SHELLFLAGS := -euo pipefail -c
.ONESHELL:
.DEFAULT_GOAL := help

# --- Tools: every binary the repository runs, in _bin (gitignored, skipped by go ./...) ------------------------------
#
# Two kinds, one place, one target. External tools (ko, cosign, kustomize, crane, flux) are pinned by version below
# and installed by `make tools`; they are never built from this repository. Local tools are this repository's own
# programs: one Go module, tools/ (on go.work), one command per tools/cmd/<name>, built from HEAD by the same
# `make tools`. Verification and release code runs from the branch under review, so tools/ is a protected path.
# A target that needs a local tool depends on its binary, which rebuilds when the module changes.

BIN ?= $(CURDIR)/_bin
export PATH := $(BIN):$(PATH)

KO_VERSION        := v0.19.1
COSIGN_VERSION    := v3.1.3
KUSTOMIZE_VERSION := v5.8.1
CRANE_VERSION     := v0.22.1
FLUX_VERSION      := 2.9.5
# flux cannot be go-installed (its go.mod has replace directives); its release tarball is pinned by sha256 instead.
FLUX_SHA256_linux_amd64 := b853df82adfd7736f580692f9f734473d571606307139f8fd20c2a80dd1ff473
FLUX_SHA256_linux_arm64 := f3e159af616ec0b9bd0a405c2185cf09d06b74652c1de3c7f377e8166826651a

PLATFORM := $(shell go env GOOS)_$(shell go env GOARCH)

LOCAL_TOOLS        := docs-check
LOCAL_TOOL_SOURCES := tools/go.mod tools/go.sum $(shell find tools -type f -name '*.go')

.PHONY: help tools release docs-check

help:
	@grep -E '^[a-z.-]+:.*## ' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'

tools: $(addprefix $(BIN)/,$(LOCAL_TOOLS)) ## Install pinned ko, cosign, kustomize, crane, flux and build tools/ into _bin
	@mkdir -p "$(BIN)"
	GOBIN="$(BIN)" go install github.com/google/ko@$(KO_VERSION)
	GOBIN="$(BIN)" go install github.com/sigstore/cosign/v3/cmd/cosign@$(COSIGN_VERSION)
	GOBIN="$(BIN)" go install sigs.k8s.io/kustomize/kustomize/v5@$(KUSTOMIZE_VERSION)
	GOBIN="$(BIN)" go install github.com/google/go-containerregistry/cmd/crane@$(CRANE_VERSION)
	if [ "$$("$(BIN)/flux" version --client 2>/dev/null)" != "flux: v$(FLUX_VERSION)" ]; then
	  sha="$(FLUX_SHA256_$(PLATFORM))"
	  [ -n "$$sha" ] || { echo "no pinned flux checksum for $(PLATFORM)" >&2; exit 1; }
	  tmp=$$(mktemp -d); trap 'rm -rf "$$tmp"' EXIT
	  curl -fsSL -o "$$tmp/flux.tar.gz" \
	    "https://github.com/fluxcd/flux2/releases/download/v$(FLUX_VERSION)/flux_$(FLUX_VERSION)_$(PLATFORM).tar.gz"
	  echo "$$sha  $$tmp/flux.tar.gz" | sha256sum --check --quiet
	  tar -xzf "$$tmp/flux.tar.gz" -C "$(BIN)" flux
	fi

$(addprefix $(BIN)/,$(LOCAL_TOOLS)): $(BIN)/%: $(LOCAL_TOOL_SOURCES)
	@mkdir -p "$(BIN)"
	go build -C tools -o "$@" ./cmd/$*

# --- Docs: docs/schema.yaml is the schema and the bounding rules; docs-check enforces it (tier 0) -------------------

docs-check: $(BIN)/docs-check ## Check docs/ against docs/schema.yaml (tools/cmd/docs-check)
	@"$(BIN)/docs-check" -config docs/schema.yaml

# --- Release: run by CI on shared infrastructure after merge, never on a workbench (delivery skill) -----------------

PRODUCT    ?=
MILJO      ?= ../miljo
REGISTRY   ?= registry.dataverket.org
COSIGN_KEY ?=
SOURCE_URL ?= $(shell git remote get-url origin 2>/dev/null)

release: ## PRODUCT=<p>: build images, join with every miljo overlay for <p>, push, sign, and tag :candidate
	@[ -n "$(PRODUCT)" ] || { echo "PRODUCT is required" >&2; exit 1; }
	[ -n "$(COSIGN_KEY)" ] || { echo "COSIGN_KEY is required" >&2; exit 1; }
	[ -z "$$(git status --porcelain)" ] || { echo "release needs a clean tree" >&2; exit 1; }
	[ -z "$$(git -C "$(MILJO)" status --porcelain)" ] || { echo "release needs a clean $(MILJO)" >&2; exit 1; }
	commit=$$(git rev-parse HEAD)
	env_config_version=$$(git -C "$(MILJO)" rev-parse HEAD)
	envs=$$(cd "$(MILJO)/environments" && for d in */$(PRODUCT); do [ -d "$$d" ] && echo "$${d%%/*}"; done)
	[ -n "$$envs" ] || { echo "no overlay for $(PRODUCT) in $(MILJO)/environments/*/$(PRODUCT)" >&2; exit 1; }
	work=$$(mktemp -d); trap 'rm -rf "$$work"' EXIT

	# L1: app manifests with images built once by ko and pinned by digest; shared by every environment.
	mkdir -p "$$work/base"
	kustomize build "$(PRODUCT)/deploy/base" > "$$work/base.yaml"
	(cd "$(PRODUCT)" && KO_DOCKER_REPO="$(REGISTRY)/$(PRODUCT)" \
	  ko resolve --base-import-paths --sbom=none --tags="$$commit" -f "$$work/base.yaml") > "$$work/base/resources.yaml"
	printf 'resources:\n- resources.yaml\n' > "$$work/base/kustomization.yaml"

	for env in $$envs; do
	  # The join: the overlay's kustomization lists ../base.
	  mkdir -p "$$work/$$env/rendered"
	  cp -R "$$work/base" "$$work/$$env/base"
	  cp -R "$(MILJO)/environments/$$env/$(PRODUCT)" "$$work/$$env/overlay"
	  kustomize build "$$work/$$env/overlay" > "$$work/$$env/rendered/manifests.yaml"

	  if grep -E '^\s*-?\s*image:' "$$work/$$env/rendered/manifests.yaml" | grep -vE '@sha256:[0-9a-f]{64}\s*$$'; then
	    echo "$$env: image not pinned by digest" >&2; exit 1
	  fi
	  images=$$(grep -oE 'image:\s*\S+@sha256:[0-9a-f]{64}' "$$work/$$env/rendered/manifests.yaml" \
	    | sed -E 's/image:\s*//' | sort -u \
	    | sed -E 's#^.*/([^/@:]+)(:[^@]*)?@(sha256:[0-9a-f]{64})$$#    "\1": "\3"#' | paste -sd, - | sed 's/,/,\n/g')
	  printf '{\n  "product": "%s",\n  "environment": "%s",\n  "app_commit": "%s",\n  "env_config_version": "%s",\n  "images": {\n%s\n  }\n}\n' \
	    "$(PRODUCT)" "$$env" "$$commit" "$$env_config_version" "$$images" > "$$work/$$env/rendered/release.json"

	  ref="$(REGISTRY)/$(PRODUCT)/config-$$env"
	  # --reproducible: the same commit and miljo version give the same digest, so a re-run cannot move the release.
	  flux push artifact "oci://$$ref:$$commit" --path="$$work/$$env/rendered" --reproducible \
	    --source="$(SOURCE_URL)" --revision="main@sha1:$$commit" --output json > "$$work/$$env/push.json"
	  digest=$$(grep -oE 'sha256:[0-9a-f]{64}' "$$work/$$env/push.json" | head -1)
	  # Key-based, no public transparency log (sovereign): cosign v3 needs both flags for that.
	  cosign sign --yes --use-signing-config=false --tlog-upload=false --key "$(COSIGN_KEY)" "$$ref@$$digest"
	  flux tag artifact "oci://$$ref:$$commit" --tag candidate
	  echo "released $$ref@$$digest (app $$commit, $(MILJO) $$env_config_version)"
	done
