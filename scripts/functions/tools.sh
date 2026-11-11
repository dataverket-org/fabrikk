#
# Where the pinned tools are and whether they match this checkout. Sourced
# by functions.sh.
#

#
# Prints the main checkout: the one every worktree of this repository shares.
# Outside a worktree that is the checkout itself.
#
function main_checkout()
{
	local common

	common="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)"

	case "$common" in
		*/.git)	echo "${common%/.git}" ;;
		*)	echo "$root" ;;
	esac
}

#
# Prints the pinned tool versions, as this checkout's scripts/tools states
# them.
#
function tool_pins()
{
	grep -E '^[a-z_]+_(version|image)=' "$root/scripts/tools"
}

#
# Fails unless the tools in _bin were installed from this checkout's pins.
# _bin is shared, so a branch that moves a pin must not be judged by the
# tools another branch installed.
#
function need_tools()
{
	local installed

	installed="$(cat "$bin/.pins" 2>/dev/null)"
	[[ -n "$installed" && "$installed" == "$(tool_pins)" ]] && return

	error "The tools in $bin were not installed from the pins in scripts/tools: run task tools"
	return 1
}
