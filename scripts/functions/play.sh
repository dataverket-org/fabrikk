#
# Playing manifests into a stack with `podman kube play`. Sourced by
# functions.sh.
#

#
# Prints a directory's manifests with every name prefixed by the stack's.
# kustomize takes the directory by a relative path only; from the overlay
# that is up to / and down again, so both paths are physical ones.
#
function render()
{
	local stack="$1"
	local dir="$2"
	local overlay ups

	dir="$(cd "$dir" && pwd -P)"                        || return $?
	overlay="$(mktemp -d "$stack_work/overlay.XXXXXX")" || return $?
	overlay="$(cd "$overlay" && pwd -P)"                || return $?
	ups="${overlay//[^\/]/}"
	ups="${ups//\//../}"

	printf 'namePrefix: %s-\nresources:\n  - %s%s\n' \
		"$stack" "$ups" "${dir#/}" > "$overlay/kustomization.yaml" ||
		return $?
	kustomize build "$overlay" || return $?
}

#
# Fails when manifests fix a host port. A fragment declares container ports
# only; which host port each gets is the stack's decision.
#
function refuse_host_ports()
{
	local manifests="$1"

	if grep -qE '^\s*(- )?hostPort:' "$manifests"; then
		error "${manifests##*/} sets a hostPort: declare containerPort only"
		return 1
	fi
}

#
# Prints the container ports manifests declare, each once.
#
function container_ports()
{
	local manifests="$1"

	grep -oE 'containerPort: *[0-9]+' "$manifests" |
		grep -oE '[0-9]+' | sort -un
}

#
# Plays manifests into a stack and loads the pods it made into played_pods.
# Each container port is published on loopback: on the same host port
# (fixed) or on one podman picks (random).
#
function play()
{
	local stack="$1"
	local manifests="$2"
	local publishing="$3"
	local port before pod
	local publish=()

	while IFS= read -r port; do
		[[ -n "$port" ]] || continue

		case "$publishing" in
			fixed)	publish+=(--publish "127.0.0.1:$port:$port") ;;
			random)	publish+=(--publish "127.0.0.1::$port") ;;
		esac
	done <<< "$(container_ports "$manifests")"

	before="$(podman pod ps -q --filter "network=$stack")" || return $?
	podman kube play --replace --quiet --network "$stack" \
		"${publish[@]}" "$manifests" >/dev/null || return $?

	played_pods=()
	for pod in $(podman pod ps -q --filter "network=$stack"); do
		[[ "$before" == *"$pod"* ]] || played_pods+=("$pod")
	done
}

#
# Plays one fragment directory into a stack: rendered with the stack's
# prefix, refused if it fixes a host port.
#
function play_fragment()
{
	local stack="$1"
	local dir="$2"
	local publishing="$3"
	local manifests="$stack_work/${dir##*/}.yaml"

	render "$stack" "$dir" > "$manifests"    || return $?
	refuse_host_ports "$manifests"           || return $?
	play "$stack" "$manifests" "$publishing" || return $?
}
