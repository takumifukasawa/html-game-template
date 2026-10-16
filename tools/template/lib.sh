#!/usr/bin/env bash
# Shared helpers for tools/template/*.sh (sourced, not executed).
# Compatible with the macOS system bash (3.2).
set -euo pipefail

TEMPLATE_REMOTE="${TEMPLATE_REMOTE:-template}"
TEMPLATE_BRANCH="${TEMPLATE_BRANCH:-main}"
TEMPLATE_REF="$TEMPLATE_REMOTE/$TEMPLATE_BRANCH"
REPO_ROOT="$(git rev-parse --show-toplevel)"
PATHS_FILE="$REPO_ROOT/tools/template/paths.txt"

# paths_in_section <template|shared> -> one path per line
paths_in_section() {
  local want="$1" section="" line
  while IFS= read -r line; do
    line="${line%%#*}"
    line="$(printf '%s' "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^\[(.+)\]$ ]]; then
      section="${BASH_REMATCH[1]}"
      continue
    fi
    [[ "$section" == "$want" ]] && printf '%s\n' "$line"
  done < "$PATHS_FILE"
  return 0
}

# path_in_section <template|shared> <path> -> exit 0 if the path is listed there
path_in_section() {
  local want="$1" p="$2" prefix
  while IFS= read -r prefix; do
    case "$prefix" in
      */) [[ "$p" == "$prefix"* ]] && return 0 ;;
      *)  [[ "$p" == "$prefix" ]] && return 0 ;;
    esac
  done < <(paths_in_section "$want")
  return 1
}

is_template_path() { path_in_section template "$1"; }
is_shared_path()   { path_in_section shared "$1"; }

# classify_commit <sha> -> template | game | mixed | empty
#   template: touches only template-owned paths
#   game:     touches no template-owned path (game and/or shared)
#   mixed:    touches both -> split it before pushing to the template
#   empty:    no file changes (e.g. a merge commit)
classify_commit() {
  local sha="$1" f t=0 g=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    if is_template_path "$f"; then t=1; else g=1; fi
  done < <(git diff-tree --no-commit-id --name-only -r --root "$sha")
  if (( t && g )); then echo mixed
  elif (( t )); then echo template
  elif (( g )); then echo game
  else echo empty
  fi
}

require_template_remote() {
  if ! git remote get-url "$TEMPLATE_REMOTE" >/dev/null 2>&1; then
    echo "error: git remote '$TEMPLATE_REMOTE' not found. Add it with:" >&2
    echo "  git remote add $TEMPLATE_REMOTE <template repo url>" >&2
    echo "(or set TEMPLATE_REMOTE / TEMPLATE_BRANCH)" >&2
    exit 1
  fi
}

require_clean_tree() {
  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    echo "error: working tree has uncommitted changes. Commit or stash first." >&2
    exit 1
  fi
}
