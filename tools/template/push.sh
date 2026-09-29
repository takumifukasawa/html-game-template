#!/usr/bin/env bash
# Send template-only commits from this game repo back to the template
# (game -> template).
#
#   tools/template/push.sh              all "template" commits since merge-base
#   tools/template/push.sh <sha>...     only these commits (must be template-only)
#
# The commits are cherry-picked onto $TEMPLATE_REF in a temporary worktree and
# pushed to the template remote as branch sync/<repo>-<timestamp>. Merge that
# branch in the template repo (or open a PR). This repo's history is untouched.
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
require_template_remote
cd "$REPO_ROOT"

git fetch -q "$TEMPLATE_REMOTE"
base="$(git merge-base HEAD "$TEMPLATE_REF")"

commits=()
if (( $# > 0 )); then
  for sha in "$@"; do commits+=("$(git rev-parse --verify "$sha^{commit}")"); done
else
  while IFS= read -r sha; do
    [[ -z "$sha" ]] && continue
    [[ "$(classify_commit "$sha")" == "template" ]] && commits+=("$sha")
  done < <(git rev-list --reverse --no-merges "$base..HEAD")
fi

if (( ${#commits[@]} == 0 )); then
  echo "nothing to push: no template-only commits since $(git rev-parse --short "$base") (see list.sh)"
  exit 0
fi

bad=0
for sha in "${commits[@]}"; do
  kind="$(classify_commit "$sha")"
  if [[ "$kind" != "template" ]]; then
    echo "error: $(git rev-parse --short "$sha") is '$kind', not template-only: $(git log -1 --format=%s "$sha")" >&2
    bad=1
  fi
done
(( bad )) && { echo "split mixed commits first (git rebase -i / git add -p)." >&2; exit 1; }

echo "pushing ${#commits[@]} commit(s) to $TEMPLATE_REMOTE:"
for sha in "${commits[@]}"; do
  printf '  %s  %s\n' "$(git rev-parse --short "$sha")" "$(git log -1 --format=%s "$sha")"
done

branch="sync/$(basename "$REPO_ROOT")-$(date +%Y%m%d-%H%M%S)"
worktree="$(mktemp -d "${TMPDIR:-/tmp}/template-sync.XXXXXX")"
git worktree add --detach "$worktree" "$TEMPLATE_REF" >/dev/null 2>&1

if ! git -C "$worktree" cherry-pick -x "${commits[@]}"; then
  echo >&2
  echo "cherry-pick stopped on a conflict. Finish it by hand:" >&2
  echo "  cd $worktree" >&2
  echo "  # resolve, git add, git cherry-pick --continue" >&2
  echo "  git push $TEMPLATE_REMOTE HEAD:refs/heads/$branch" >&2
  echo "  cd - && git worktree remove --force $worktree" >&2
  exit 1
fi

if ! git -C "$worktree" push "$TEMPLATE_REMOTE" "HEAD:refs/heads/$branch"; then
  echo >&2
  echo "push failed. The cherry-picked commits are in $worktree; retry with:" >&2
  echo "  git -C $worktree push $TEMPLATE_REMOTE HEAD:refs/heads/$branch" >&2
  echo "  git worktree remove --force $worktree" >&2
  exit 1
fi
git worktree remove --force "$worktree"

echo
echo "pushed $branch. In the template repo:"
echo "  git fetch origin && git merge origin/$branch     # or open a PR"
