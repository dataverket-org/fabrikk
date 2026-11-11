#
# Shared by every script in scripts/. Sourced, never run. The functions are
# in scripts/functions/, one file per topic; this file loads them and sets
# up the run. Protected path: verification and release run these scripts
# from the branch under review.
#

# A pipeline fails when any command in it fails, so an empty grep is not
# hidden by the sed after it.
set -o pipefail

functions_dir="${BASH_SOURCE[0]%/*}/functions"

source "$functions_dir/logging.sh"    || return $?
source "$functions_dir/tools.sh"      || return $?
source "$functions_dir/repository.sh" || return $?
source "$functions_dir/podman.sh"     || return $?
source "$functions_dir/stack.sh"      || return $?
source "$functions_dir/play.sh"       || return $?

#
# Moves to the repository root, puts the main checkout's _bin first on PATH
# and points Docker API clients at the user's podman. One _bin serves every
# worktree, so a work item needs no tools of its own.
#
function init()
{
	cd "${BASH_SOURCE[0]%/*}/.." || return $?

	root="$PWD"
	bin="${BIN:-$(main_checkout)/_bin}"
	export PATH="$bin:$PATH"

	use_podman_socket
}
