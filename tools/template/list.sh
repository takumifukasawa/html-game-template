#!/usr/bin/env bash
# List the commits on HEAD that the template does not have yet, classified by
# the paths they touch (see tools/template/paths.txt):
#   template  only template-owned paths      -> push.sh sends these
#   game      only game / shared paths
#   mixed     both -> split with `git rebase -i` before pushing to the template
#
#   tools/template/list.sh
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
require_template_remote

git fetch -q "$TEMPLATE_REMOTE"
base="$(git merge-base HEAD "$TEMPLATE_REF")"
echo "commits since merge-base $(git rev-parse --short "$base") with $TEMPLATE_REF:"
count=0
while IFS= read -r sha; do
  [[ -z "$sha" ]] && continue
  count=$((count + 1))
  printf '  %-9s %s  %s\n' "$(classify_commit "$sha")" "$(git rev-parse --short "$sha")" "$(git log -1 --format=%s "$sha")"
done < <(git rev-list --reverse --no-merges "$base..HEAD")
(( count == 0 )) && echo "  (none)"
exit 0
