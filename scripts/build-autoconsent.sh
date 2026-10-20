#!/usr/bin/env bash
# Rebuilds vendor/autoconsent/ from a tagged release of DuckDuckGo's autoconsent.
#
#   scripts/build-autoconsent.sh            # uses AUTOCONSENT_VERSION below
#   scripts/build-autoconsent.sh 16.58.0    # or a specific release
#
# Needs git plus either bun or node/npx (for esbuild and ts-node).
set -euo pipefail

AUTOCONSENT_VERSION="${1:-16.57.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/vendor/autoconsent"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Fetching autoconsent v$AUTOCONSENT_VERSION"
git -c advice.detachedHead=false clone --quiet --depth 1 --branch "v$AUTOCONSENT_VERSION" https://github.com/duckduckgo/autoconsent "$WORK/autoconsent"
SRC="$WORK/autoconsent"
COMMIT="$(git -C "$SRC" rev-parse HEAD)"

mkdir -p "$SRC/cookie-pookie"
cp "$ROOT/scripts/autoconsent/"*-entry.js "$SRC/cookie-pookie/"

bundle() { # entry outfile
  if command -v bun >/dev/null; then
    bun build "$1" --format=iife --target=browser --outfile="$2" >/dev/null
  else
    npx --yes esbuild@0.25 "$1" --bundle --format=iife --target=es2021 --outfile="$2"
  fi
}

echo "Building rules"
if command -v bun >/dev/null; then
  (cd "$SRC" && bun rules/build.ts)
else
  (cd "$SRC" && npx --yes ts-node rules/build.ts)
fi
sleep 1 # build.ts writes its files asynchronously

rm -rf "$OUT"
mkdir -p "$OUT"
bundle "$SRC/cookie-pookie/content-entry.js" "$OUT/content-lib.js"
bundle "$SRC/cookie-pookie/background-entry.js" "$OUT/background-lib.js"
cp "$SRC/rules/compact-rules.json" "$OUT/compact-rules.json"
cp "$SRC/LICENSE" "$OUT/LICENSE"

for f in "$OUT/content-lib.js" "$OUT/background-lib.js"; do
  { printf '/* Built from DuckDuckGo autoconsent v%s (%s).\n * Licensed under the Mozilla Public License 2.0, see LICENSE in this folder.\n * Source: https://github.com/duckduckgo/autoconsent */\n' "$AUTOCONSENT_VERSION" "$COMMIT"; cat "$f"; } > "$f.tmp"
  mv "$f.tmp" "$f"
done

cat > "$OUT/VERSION" <<EOF
autoconsent $AUTOCONSENT_VERSION
commit $COMMIT
EOF

echo "Done: $OUT"
ls -lh "$OUT"
