#!/usr/bin/env bash
# Create a new game repo from this template.
#
#   npm run template:new -- <name> [<dir>] [<origin-url>] [--engine <phaser|three|babylon>]
#   (or: tools/template/new-game.sh <name> [<dir>] [<origin-url>] [--engine <engine>])
#   e.g. npm run template:new -- my-game ../my-game git@github.com:me/my-game.git --engine phaser
#
# - clones this template checkout into <dir> (default: ../<name>)
# - names the clone's template remote `template` (pointing at this template's
#   origin URL so pull.sh / push.sh sync with the real template) and adds
#   <origin-url> as `origin` when given
# - sets the package name, the <title>, a README stub
# - with --engine: installs that engine and applies its starter app
#   (tools/template/engine.sh); without it the clone stays engine-free and
#   `npm run engine -- <engine>` does it later
# - commits
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
template_root="$(git -C "$here" rev-parse --show-toplevel)"

engine=""
positional=()
while (( $# > 0 )); do
  case "$1" in
    --engine)   engine="${2:?--engine needs a value}"; shift 2 ;;
    --engine=*) engine="${1#--engine=}"; shift ;;
    --*)        echo "unknown option: $1" >&2; exit 2 ;;
    *)          positional+=("$1"); shift ;;
  esac
done
set -- ${positional[@]+"${positional[@]}"}

name="${1:?usage: new-game.sh <name> [dir] [origin-url] [--engine <engine>]}"
dir="${2:-$template_root/../$name}"
origin_url="${3:-}"
template_url="$(git -C "$template_root" remote get-url origin 2>/dev/null || true)"

if [[ -n "$engine" ]]; then
  case "$engine" in
    phaser|three|babylon) ;;
    *) echo "error: --engine must be phaser, three or babylon (got '$engine')" >&2; exit 2 ;;
  esac
fi
if [[ -e "$dir" ]]; then
  echo "error: $dir already exists" >&2
  exit 1
fi
if [[ -n "$(git -C "$template_root" status --porcelain)" ]]; then
  echo "warning: the template has uncommitted changes; they will NOT be in the clone" >&2
fi
if [[ -n "$template_url" ]] && git -C "$template_root" rev-parse --verify -q "origin/main" >/dev/null; then
  ahead="$(git -C "$template_root" rev-list --count "origin/main..HEAD")"
  if (( ahead > 0 )); then
    echo "warning: the template has $ahead commit(s) not pushed to origin; push them, or the new game's" >&2
    echo "         template remote ($template_url) will lag behind what was cloned" >&2
  fi
fi

git clone -q "$template_root" "$dir"
cd "$dir"
git remote rename origin template
if [[ -n "$template_url" ]]; then
  git remote set-url template "$template_url"
fi
if [[ -n "$origin_url" ]]; then
  git remote add origin "$origin_url"
fi

npm pkg set name="$name"
node -e '
  const fs = require("fs");
  const p = "index.html";
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/<title>.*?<\/title>/, "<title>" + process.argv[1] + "</title>"));
' "$name"
printf '# %s\n\nBuilt from the html-game template. Template workflow: see docs/TEMPLATE.md.\n' "$name" > README.md

if [[ -n "$engine" ]]; then
  echo "selecting engine '$engine' (runs npm install)..."
  bash tools/template/engine.sh "$engine" --starter
fi

git add -A
git commit -q -m "chore: bootstrap $name from template${engine:+ ($engine)}"

echo "created $dir"
echo "  remotes: template -> $(git remote get-url template)${origin_url:+, origin -> $origin_url}"
echo "next:"
if [[ -n "$engine" ]]; then
  echo "  cd $dir && npm run dev"
else
  echo "  cd $dir && npm install"
  echo "  npm run engine -- <phaser|three|babylon>    # installs the engine + its starter app"
  echo "  npm run dev"
fi
[[ -n "$origin_url" ]] && echo "  git push -u origin main"
exit 0
