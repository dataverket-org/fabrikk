#
# The container engine. Sourced by functions.sh.
#
# One engine is supported: rootless podman, at least the version Ubuntu
# 26.04 ships. Nothing here runs a container as root, nothing falls back to
# another engine, and nothing uses compose.
#

# The podman of Ubuntu 26.04, the oldest release supported.
podman_major=5
podman_minor=7

#
# Fails unless podman is rootless and at least the supported version.
#
function need_podman()
{
	local version major minor rootless

	if ! command -v podman >/dev/null; then
		error "podman is required: rootless, $podman_major.$podman_minor or newer"
		return 1
	fi

	version="$(podman --version)" || return $?
	version="${version##* }"
	major="${version%%.*}"
	minor="${version#*.}"
	minor="${minor%%.*}"

	if (( major < podman_major ||
	      (major == podman_major && minor < podman_minor) )); then
		error "podman $version is too old: $podman_major.$podman_minor or newer is required"
		return 1
	fi

	rootless="$(podman info --format '{{.Host.Security.Rootless}}')" ||
		return $?

	if [[ "$rootless" != "true" ]]; then
		error "podman is not rootless here: the stacks never run as root"
		return 1
	fi
}

#
# Points Docker API clients, ko among them, at the user's podman socket, so
# an image built with ko --local is in the engine the stack runs on. Without
# it they use the system socket, which rootless podman does not see. A
# DOCKER_HOST the caller set is left alone.
#
function use_podman_socket()
{
	local socket="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock"

	[[ -n "$DOCKER_HOST" || ! -S "$socket" ]] && return

	export DOCKER_HOST="unix://$socket"
}
