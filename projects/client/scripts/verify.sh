#!/usr/bin/env bash
# Everything GitHub Actions used to check on a PR, run locally: supply chain, commits, then `deno task ci`.
# `deno task client:land` refuses to merge without this passing.
# Usage: deno task verify [pr-number]   (the PR number is only needed if deno.json's allowScripts grew)
set -euo pipefail

pr="${1:-}"
[ -z "$pr" ] || [[ "$pr" =~ ^[0-9]+$ ]] || { echo "verify: the PR number must be digits" >&2; exit 1; }
base="origin/main"
fail() { echo "verify: $*" >&2; exit 1; }

"$(dirname "$0")/leak-check.sh" ${pr:+"$pr"}

git fetch --quiet origin main

echo "verify: exact pins"
ranges=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | to_entries[] | select(.value | test("^[\\^~]")) | "\(.key)@\(.value)"' package.json)
[ -z "$ranges" ] || fail "semver ranges in package.json, pin exact versions: $ranges"

echo "verify: allowScripts"
# Any entry that isn't on main's list needs review, not just a longer list. A non-array value (for example `true`,
# which allows every package) counts as a change too. jq failing on the file (comments, bad JSON) fails verify.
scripts='[(.allowScripts // []) | if type == "array" then .[] | tostring else "non-array: " + tojson end]'
before=$( (git show "$base:deno.json" 2>/dev/null || echo '{}') | jq -c "$scripts")
after=$(jq -c "$scripts" "$(git rev-parse --show-toplevel)/deno.json")
added=$(jq -rn --argjson a "$after" --argjson b "$before" '$a - $b | join(", ")')
if [ -n "$added" ]; then
  [ -n "$pr" ] || fail "allowScripts gained $added. Pass the PR number, and label the PR allowlist-change after review."
  gh pr view "$pr" --repo trakt/og --json labels -q '.labels[].name' | grep -qx 'allowlist-change' \
    || fail "allowScripts gained $added without the allowlist-change label on PR #$pr."
fi

echo "verify: frozen install"
deno install --frozen

echo "verify: commits since $base"
[ -n "$(git log --format=%H "$base..HEAD")" ] || fail "no commits ahead of $base"
if git log --format=%s "$base..HEAD" | grep -E '^(fixup|squash|amend)! '; then
  fail "fold fixup commits in first: GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash $base"
fi
deno run -A npm:@commitlint/cli --from "$base" --to HEAD

echo "verify: deno task ci"
deno task ci

echo "verify: ok at $(git rev-parse --short HEAD)"
