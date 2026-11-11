#
# What the scripts ask of the git tree and the Go workspace. Sourced by
# functions.sh.
#

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
