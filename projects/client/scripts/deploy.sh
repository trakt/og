#!/usr/bin/env bash
# Deploy origin/main to og.trakt.tv from a fresh temporary worktree, after running `deno task ci` on it.
# Humans only: agents never deploy. `deno task land` merges without deploying, so run this to update the site.
set -euo pipefail

root=$(git rev-parse --show-toplevel)
git -C "$root" fetch --quiet origin main
dir=$(mktemp -d "${TMPDIR:-/tmp}/og-deploy.XXXXXX")
trap 'git -C "$root" worktree remove --force "$dir" >/dev/null 2>&1 || true' EXIT
git -C "$root" worktree add --quiet --detach "$dir" origin/main
cd "$dir"
deno install --frozen
deno task client:ci
cd projects/client
deno run -A npm:wrangler deploy --message "main $(git rev-parse --short HEAD), deployed locally"
