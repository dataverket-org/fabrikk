#
# Shared by every script in scripts/: where things are, logging, and the
# checks more than one script makes. Sourced, never run. Protected path:
# verification and release run these scripts from the branch under review.
#

# A pipeline fails when any command in it fails, so an empty grep is not
# hidden by the sed after it.
set -o pipefail

compose_file="${COMPOSE_FILE:-compose.yaml}"

# Compose names a project after the directory it runs from, so two worktrees
# would start two stacks and collide on host ports. The names are fixed here
# and never derived from the worktree (dev-environment skill).
#   dev_project     tier 0 and 1: every worktree on this machine joins the
#                   same nats and postgres; tests isolate themselves by name.
#   verify-<commit> tier 2: private to the commit, torn down when done.
dev_project="dataverket"

#
# Prints a log message.
#
function log()
{
	if [[ -t 1 ]]; then
		echo -e "\x1b[1m\x1b[32m>>>\x1b[0m \x1b[1m$1\x1b[0m"
	else
		echo ">>> $1"
	fi
}

#
# Prints an error message.
#
function error()
{
	if [[ -t 1 ]]; then
		echo -e "\x1b[1m\x1b[31m!!!\x1b[0m \x1b[1m$1\x1b[0m" >&2
	else
		echo "!!! $1" >&2
	fi
}

#
# Prints an error message and exits.
#
function fail()
{
	error "$*"
	exit 1
}

#
# Moves to the repository root, puts _bin first on PATH and picks compose.
#
function init()
{
	cd "${BASH_SOURCE[0]%/*}/.." || return $?

	root="$PWD"
	bin="${BIN:-$root/_bin}"
	export PATH="$bin:$PATH"

	if [[ -n "$COMPOSE" ]]; then
		read -r -a compose <<< "$COMPOSE"
	elif command -v podman >/dev/null; then
		compose=(podman compose)
	else
		compose=(docker compose)
	fi
}

#
# Fails unless the session stack's compose file exists.
#
function need_compose()
{
	[[ -f "$compose_file" ]] && return

	error "$compose_file is missing: the session stack arrives with the first product (dev-environment skill)"
	return 1
}

#
# Runs compose against the shared session stack.
#
function dev_compose()
{
	"${compose[@]}" -p "$dev_project" -f "$compose_file" "$@"
}

#
# Fails unless the git tree in a directory has no changes.
#
function clean_tree()
{
	local dir="$1"
	local changes

	changes="$(git -C "$dir" status --porcelain)" || return $?
	[[ -z "$changes" ]]
}

#
# Loads the directory of every Go module in go.work into the modules array.
# go.work has no root module, so ./... from the root matches nothing; every
# Go step iterates the modules instead.
#
function load_modules()
{
	local listing dir

	modules=()
	listing="$(go list -m -f '{{.Dir}}')" || return $?
	[[ -z "$listing" ]] && return

	while IFS= read -r dir; do
		modules+=("$dir")
	done <<< "$listing"
}
