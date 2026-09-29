#!/usr/bin/env bash
# Merge the latest template into this game repo (template -> game).
#
#   tools/template/pull.sh        (npm run template:pull)
#
# - merges $TEMPLATE_REF (default template/main) with --no-ff
# - template-owned paths: taken from the merge (conflicts stop for manual fixing)
# - shared paths (package.json, index.html, ...): 3-way merged; a conflicted
#   package-lock.json is reset to ours -- run `npm install` afterwards
# - game-owned paths (src/scripts/app/, docs/GAME.md, ...): template-side
#   changes are DROPPED; this repo owns them
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"
require_template_remote
require_clean_tree
cd "$REPO_ROOT"

git fetch "$TEMPLATE_REMOTE"
if ! base="$(git merge-base HEAD "$TEMPLATE_REF" 2>/dev/null)"; then
  echo "error: no common history with $TEMPLATE_REF. The game repo must be a clone of the template" >&2
  echo "       (not a GitHub \"Use this template\" copy). See docs/TEMPLATE.md." >&2
  exit 1
fi
if [[ "$base" == "$(git rev-parse "$TEMPLATE_REF")" ]]; then
  echo "already up to date with $TEMPLATE_REF"
  exit 0
fi

echo "merging $TEMPLATE_REF ($(git rev-parse --short "$TEMPLATE_REF"))..."
# Conflicts are expected here and handled below; anything else (e.g. an untracked
# file in the way) means the merge never started, so stop with git's message.
merge_out="$(git merge --no-ff --no-commit "$TEMPLATE_REF" 2>&1)" || true
if ! git rev-parse -q --verify MERGE_HEAD >/dev/null; then
  printf '%s\n' "$merge_out" >&2
  echo "error: merge did not start" >&2
  exit 1
fi

# Drop template-side changes to game-owned paths: restore HEAD's version, or
# remove files the template added there.
dropped=0
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if is_template_path "$f" || is_shared_path "$f"; then continue; fi
  if git cat-file -e "HEAD:$f" 2>/dev/null; then
    git checkout HEAD -- "$f"
  else
    git rm -q -f --cached -- "$f" 2>/dev/null || true
    rm -f -- "$f"
  fi
  dropped=$((dropped + 1))
done < <(git diff --name-only --no-renames "$base" "$TEMPLATE_REF")
(( dropped > 0 )) && echo "kept this repo's version of $dropped game-owned path(s)"

# A conflicted lockfile is never worth hand-merging: keep ours, regenerate.
if git diff --name-only --diff-filter=U | grep -x "package-lock.json" >/dev/null; then
  git checkout HEAD -- package-lock.json
  echo "package-lock.json: kept ours (regenerate with npm install)"
fi

conflicts="$(git diff --name-only --diff-filter=U)"
if [[ -n "$conflicts" ]]; then
  echo
  echo "merge stopped: resolve these conflicts, then \`git add\` them and \`git commit\`:"
  printf '%s\n' "$conflicts" | sed 's/^/  /'
  exit 1
fi

git commit -q -m "chore(template): merge $TEMPLATE_REF ($(git rev-parse --short "$TEMPLATE_REF"))"
echo "merged as $(git rev-parse --short HEAD)"
if git diff --name-only "HEAD^" HEAD | grep -x "package.json" >/dev/null; then
  echo "package.json changed: run \`npm install\` and commit the lockfile"
fi
if git diff --name-only "HEAD^" HEAD | grep -x "tools/template/engine.sh" >/dev/null; then
  cur="$(node -p 'const p = require("./package.json"); (p.config && p.config.engine) || "none"')"
  echo "tools/template/engine.sh changed: re-run \`npm run engine -- $cur\` to refresh tsconfig.engine.json"
fi
