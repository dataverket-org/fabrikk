# fabrikk monorepo. Protected path: verification and release run these targets.
# Dev-environment targets need compose.yaml and the products' suites, which arrive with the first product; the stack
# naming they enforce is decided here (dev-environment skill, "Session stack").

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

.PHONY: help tools release docs-check dev.up dev.down dev.reset check verify

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

# --- Dev environment: one shared session stack per workbench, one private verify stack per commit ------------------
#
# Compose names a project after the directory it runs from, so two worktrees would start two stacks and collide on
# host ports. Instead the project name is fixed here and never derived from the worktree:
#   DEV_PROJECT    tier 0 and 1: every worktree on this machine joins the same nats and postgres; tests isolate
#                  themselves by name (dev-environment skill). Fixed, well-known host ports.
#   VERIFY_PROJECT tier 2: the images built from this commit under the verify profile, private to the commit, torn
#                  down when done. Nothing in it may publish a fixed host port; the suite asks compose for the port.

COMPOSE        ?= $(if $(shell command -v podman 2>/dev/null),podman compose,docker compose)
COMPOSE_FILE   ?= compose.yaml
PROFILE        ?= default
PROFILE_FLAG    = $(if $(filter default,$(PROFILE)),,--profile $(PROFILE))
DEV_PROJECT    := dataverket
VERIFY_PROJECT  = verify-$(shell git rev-parse --short=12 HEAD)
COMMIT          = $(shell git rev-parse HEAD)
WIPE           ?=
VERIFY_SUITE   ?= go test -count=1 -tags verify ./...
# go.work has no root module, so ./... from the root matches nothing; every Go target iterates the modules it lists.
MODULES         = $(shell go list -m -f '{{.Dir}}')
PRODUCTS        = $(filter-out tools,$(notdir $(MODULES)))

define need_compose
	[ -f "$(COMPOSE_FILE)" ] || { echo "$(COMPOSE_FILE) is missing: the session stack arrives with the first product (dev-environment skill)" >&2; exit 1; }
endef

dev.up: ## [PROFILE=objekt|maskin] Start the shared session stack for this workbench and wait until healthy
	@$(need_compose)
	$(COMPOSE) -p $(DEV_PROJECT) -f $(COMPOSE_FILE) $(PROFILE_FLAG) up --wait

dev.down: ## Stop the shared session stack, keep volumes
	@$(need_compose)
	$(COMPOSE) -p $(DEV_PROJECT) -f $(COMPOSE_FILE) --profile '*' down

dev.reset: ## [PROFILE=...] [WIPE=1] Run every fragment's reset script; WIPE=1 also removes volumes
	@$(need_compose)
	for r in deploy/dev/*/reset.sh; do if [ -x "$$r" ]; then echo "reset: $$r"; "$$r"; fi; done
	[ -z "$(WIPE)" ] || $(COMPOSE) -p $(DEV_PROJECT) -f $(COMPOSE_FILE) --profile '*' down --volumes

check: docs-check ## Tier 0: docs-check, gofmt, go vet, go test over every module in go.work (golangci-lint joins with the first product)
	@unformatted=$$(gofmt -l $(MODULES) </dev/null)
	[ -z "$$unformatted" ] || { echo "gofmt:"; echo "$$unformatted"; exit 1; }
	for m in $(MODULES); do go -C "$$m" vet ./... && go -C "$$m" test ./...; done

verify: ## Tier 2: ko images for this commit, private verify stack, contract and black-box suites from outside, teardown
	@$(need_compose)
	[ -z "$$(git status --porcelain)" ] || { echo "verify needs a clean tree: the result is pinned to $(COMMIT)" >&2; exit 1; }
	# No service in the verify stack may publish a fixed host port, or two commits verifying at once collide.
	cfg=$$(mktemp); trap 'rm -f "$$cfg"' EXIT
	$(COMPOSE) -p $(VERIFY_PROJECT) -f $(COMPOSE_FILE) --profile verify config > "$$cfg"
	if grep -qE '^\s+published:' "$$cfg"; then
	  echo "verify profile publishes fixed host ports; leave the host side empty so compose picks one" >&2; exit 1
	fi
	trap 'rm -f "$$cfg"; $(COMPOSE) -p $(VERIFY_PROJECT) -f $(COMPOSE_FILE) --profile verify down --volumes --remove-orphans' EXIT
	for p in $(PRODUCTS); do
	  [ -d "$$p/deploy/base" ] || continue
	  (cd "$$p" && KO_DOCKER_REPO=ko.local ko build --local --bare --tags="$(COMMIT)" ./cmd/... >/dev/null)
	done
	COMMIT=$(COMMIT) $(COMPOSE) -p $(VERIFY_PROJECT) -f $(COMPOSE_FILE) --profile verify up --wait
	COMPOSE_PROJECT_NAME=$(VERIFY_PROJECT) $(VERIFY_SUITE)

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
