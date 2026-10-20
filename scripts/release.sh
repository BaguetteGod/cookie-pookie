#!/usr/bin/env bash
# Starts a release: bumps the version, commits, tags and pushes. The tag starts
# the Release workflow, which tests, builds and submits it to addons.mozilla.org.
#
#   scripts/release.sh 0.4.0
#
# Before running it, add a "## 0.4.0" section to CHANGELOG.md with the release
# notes and commit it.
set -euo pipefail

VERSION="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() { echo "release: $*" >&2; exit 1; }

[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "usage: scripts/release.sh <major.minor.patch>"
[ "$(git rev-parse --abbrev-ref HEAD)" = "master" ] || fail "releases are made from master."
[ -z "$(git status --porcelain)" ] || fail "commit or stash your changes first."
git fetch --quiet origin master
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" ] || fail "master isn't in sync with origin/master; pull or push first."
git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null && fail "tag v$VERSION already exists."

CURRENT="$(node -p 'require("./manifest.json").version')"
node -e '
  const [a, b] = process.argv.slice(1).map((v) => v.split(".").map(Number));
  const newer = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  process.exit(newer > 0 ? 0 : 1);
' "$VERSION" "$CURRENT" || fail "$VERSION isn't newer than the current version $CURRENT."
node scripts/amo-metadata.mjs "$VERSION" --notes >/dev/null || fail "add release notes to CHANGELOG.md first."

npm version "$VERSION" --no-git-tag-version >/dev/null
node -e '
  const fs = require("fs");
  const text = fs.readFileSync("manifest.json", "utf8");
  const next = text.replace(/("version":\s*")[^"]+(")/, `$1${process.argv[1]}$2`);
  if (next === text) process.exit(1);
  fs.writeFileSync("manifest.json", next);
' "$VERSION" || fail "couldn't update the version in manifest.json."

git add manifest.json package.json package-lock.json
git commit --quiet -m "Release $VERSION"
git tag -a "v$VERSION" -m "Cookie Pookie $VERSION"
git push --quiet --atomic origin master "v$VERSION"

echo "Pushed v$VERSION. The Release workflow now tests it and submits it to addons.mozilla.org:"
echo "  https://github.com/BaguetteGod/cookie-pookie/actions/workflows/release.yml"
