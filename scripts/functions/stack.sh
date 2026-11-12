#
# The stacks. Sourced by functions.sh.
#
# A stack is a podman network of the stack's name and the pods played into
# it with `podman kube play`. What is played is a fragment: a kustomization
# under deploy/dev/<profile>/<system>/, or for the system tests a product's
# own deploy/base. Every pod name gets the stack's name as a prefix, so two
# stacks never collide; inside a stack a pod is reached by the hostname its
# manifest sets.
#
#   verify-<commit>  the system tests': private to the commit.
#   stack-<pid>      task stack's: private to the shell that asked for it.
#
# Every stack is made new and removed when its script ends, volumes
# included, and each port is on a host port podman picks. The scripts name
# the stacks; a name is never derived from a worktree.
#

fragments_dir="deploy/dev"
boot_budget="${BOOT_BUDGET:-120}"

#
# Fails unless there are fragments to play.
#
function need_stack()
{
	[[ -d "$fragments_dir/default" ]] && return

	error "$fragments_dir/default is missing: there is no fragment to play (dev-environment skill)"
	return 1
}

#
# Prints the fragment directories of the given profiles, one per line.
#
function fragments()
{
	local profile dir

	for profile in "$@"; do
		for dir in "$fragments_dir/$profile"/*/; do
			[[ -f "${dir}kustomization.yaml" ]] && echo "${dir%/}"
		done
	done
}

#
# Creates the work directory the rendered manifests go into, and a stack's
# network unless it is there.
#
function stack_prepare()
{
	local stack="$1"

	stack_work="$(mktemp -d)" || return $?

	podman network exists "$stack" && return
	podman network create "$stack" >/dev/null || return $?
}

#
# Prints the ids of a stack's containers, the pods' infra ones left out.
#
function stack_containers()
{
	local stack="$1"
	local pod id

	for pod in $(podman pod ps -q --filter "network=$stack"); do
		for id in $(podman ps -aq --filter "pod=$pod"); do
			[[ "$(podman inspect --format '{{.IsInfra}}' "$id")" == "true" ]] ||
				echo "$id"
		done
	done
}

#
# Waits until every container of a stack is healthy, within the boot budget.
# A container with no health check fails at once: every one declares a
# livenessProbe, and ready has to mean ready.
#
function wait_healthy()
{
	local stack="$1"
	local deadline=$(( SECONDS + boot_budget ))
	local ids id state name pending

	while :; do
		ids="$(stack_containers "$stack")" || return $?
		if [[ -z "$ids" ]]; then
			error "$stack has no containers"
			return 1
		fi

		pending=""
		for id in $ids; do
			state="$(podman inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} {{.State.Status}} {{.Name}}' "$id")" ||
				return $?
			name="${state##* }"

			case "$state" in
				healthy\ *)	;;
				none\ *)
					error "$name has no health check: declare a livenessProbe"
					return 1
					;;
				unhealthy\ *|*\ exited\ *)
					error "$name is ${state% *}"
					return 1
					;;
				*)	pending="$pending $name" ;;
			esac
		done

		[[ -z "$pending" ]] && return

		if (( SECONDS >= deadline )); then
			error "not healthy after ${boot_budget}s:$pending"
			return 1
		fi

		sleep 1
	done
}

#
# Prints the end of every container's log in a stack.
#
function stack_logs()
{
	local stack="$1"
	local id

	for id in $(stack_containers "$stack"); do
		log "last lines of $(podman inspect --format '{{.Name}}' "$id"):"
		podman logs --tail 40 "$id" 2>&1
	done
}

#
# Removes a stack's pods, the volumes its manifests claimed and its network.
# A claim's volume has the claim's name, which starts with the stack's.
#
function stack_down()
{
	local stack="$1"
	local pod volume

	for pod in $(podman pod ps -q --filter "network=$stack"); do
		podman pod rm --force "$pod" >/dev/null || return $?
	done

	for volume in $(podman volume ls -q --filter "name=^$stack-"); do
		podman volume rm "$volume" >/dev/null || return $?
	done

	if podman network exists "$stack"; then
		podman network rm "$stack" >/dev/null || return $?
	fi
}
