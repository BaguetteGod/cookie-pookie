#!/usr/bin/env bash
# Rebuilds vendor/autoconsent/ from a published release of DuckDuckGo's autoconsent.
#
#   npm ci                                   # once: installs the pinned esbuild
#   scripts/build-autoconsent.sh             # rebuilds the version in vendor/autoconsent/VERSION
#   scripts/build-autoconsent.sh 16.58.0     # or a specific release
#
# The output is reproducible: the same autoconsent version gives byte-identical
# files on any machine. Everything comes from the @duckduckgo/autoconsent npm
# package (npm checks it against the registry's integrity hash):
#   - rules are copied as published, because rebuilding them renames the
#     auto-generated rules on every run;
#   - the JavaScript is bundled from the package's TypeScript sources with the
#     esbuild version pinned in package-lock.json.
# Needs Node with npm.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/vendor/autoconsent"
AUTOCONSENT_VERSION="${1:-$(awk '/^autoconsent /{print $2}' "$OUT/VERSION" 2>/dev/null)}"
ESBUILD="$ROOT/node_modules/.bin/esbuild"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ -z "$AUTOCONSENT_VERSION" ]; then
  echo "No version given and none found in $OUT/VERSION." >&2
  exit 1
fi
if [ ! -x "$ESBUILD" ]; then
  echo "esbuild is missing: run 'npm ci' first." >&2
  exit 1
fi

echo "Fetching @duckduckgo/autoconsent@$AUTOCONSENT_VERSION from npm"
INTEGRITY="$(cd "$WORK" && npm pack --silent --json "@duckduckgo/autoconsent@$AUTOCONSENT_VERSION" \
  | node -e 'console.log(JSON.parse(require("fs").readFileSync(0, "utf8"))[0].integrity)')"
tar -xzf "$WORK/duckduckgo-autoconsent-$AUTOCONSENT_VERSION.tgz" -C "$WORK"
PKG="$WORK/package"

mkdir -p "$PKG/cookie-pookie"
cp "$ROOT/scripts/autoconsent/"*-entry.js "$PKG/cookie-pookie/"

bundle() { # entry outfile
  # Run from inside the package so the module comments esbuild writes hold
  # stable relative paths rather than this run's temporary directory.
  (cd "$PKG" && "$ESBUILD" "$1" --bundle --format=iife --target=es2021 --log-level=warning --outfile="$2")
}

echo "Bundling with esbuild $("$ESBUILD" --version)"
rm -rf "$OUT"
mkdir -p "$OUT"
bundle cookie-pookie/content-entry.js "$OUT/content-lib.js"
bundle cookie-pookie/background-entry.js "$OUT/background-lib.js"
cp "$PKG/rules/compact-rules.json" "$OUT/compact-rules.json"
cp "$PKG/LICENSE" "$OUT/LICENSE"

for f in "$OUT/content-lib.js" "$OUT/background-lib.js"; do
  { printf '/* Built from DuckDuckGo autoconsent v%s (npm @duckduckgo/autoconsent).\n * Licensed under the Mozilla Public License 2.0, see LICENSE in this folder.\n * Source: https://github.com/duckduckgo/autoconsent */\n' "$AUTOCONSENT_VERSION"; cat "$f"; } > "$f.tmp"
  mv "$f.tmp" "$f"
done

cat > "$OUT/VERSION" <<EOF
autoconsent $AUTOCONSENT_VERSION
npm @duckduckgo/autoconsent@$AUTOCONSENT_VERSION $INTEGRITY
esbuild $("$ESBUILD" --version)
EOF

echo "Done: $OUT"
ls -lh "$OUT"
