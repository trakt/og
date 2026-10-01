#!/usr/bin/env bash
# Rebase, verify and merge a public PR, then close its separately supplied issue.
# Run from the PR branch: deno task client:land <pr> --issue <N>.
set -euo pipefail

[ "$#" = 3 ] && [ "$2" = --issue ] || { echo 'usage: land <pr> --issue <N>' >&2; exit 1; }
pr="$1"
issue="$3"
fail() { echo "land: $*" >&2; exit 1; }
[[ "$pr" =~ ^[0-9]+$ ]] || fail "the PR number must be digits"
[[ "$issue" =~ ^[0-9]+$ ]] || fail "the issue number must be digits"

lock="$(git rev-parse --git-common-dir)/og-land.lock"
mkdir "$lock" 2>/dev/null || fail "another land is running on this machine ($lock). Wait for it, or remove the lock if it's stale."
trap 'rmdir "$lock"' EXIT

meta=$(gh pr view "$pr" --repo trakt/og --json state,isDraft,headRefName,labels,body)
[ "$(jq -r .state <<<"$meta")" = OPEN ] || fail "PR #$pr isn't open"
branch=$(jq -r .headRefName <<<"$meta")
# The branch name comes from GitHub, so it must be a plain branch name and can't look like an option.
[[ "$branch" != -* ]] && git check-ref-format --branch "$branch" >/dev/null 2>&1 || fail "PR #$pr has an unusable branch name: $branch"
[ "$(git branch --show-current)" = "$branch" ] || fail "check out $branch (the PR's branch) in this worktree first"
[ -z "$(git status --porcelain)" ] || fail "the working tree isn't clean"
held=$(jq -r '[.labels[].name | select(. == "needs-human" or . == "rework" or . == "blocked")] | join(", ")' <<<"$meta")
[ -z "$held" ] || fail "PR #$pr is labelled $held. A human clears that, not land."
if jq -r .body <<<"$meta" | grep -i 'og-legacy' >/dev/null; then
  fail "the PR body mentions the private issue repository"
fi
# Refuse a missing issue before any rebase, push or merge.
gh issue view "$issue" --repo trakt/og-legacy --json state -q .state >/dev/null

git fetch --quiet origin main "$branch"
if ! git merge-base --is-ancestor origin/main HEAD; then
  echo "land: rebasing $branch onto origin/main"
  git rebase origin/main || fail "rebase conflict. Resolve it, then run land again."
fi
if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$branch")" ]; then
  git push --quiet --force-with-lease origin "$branch"
fi

"$(dirname "$0")/verify.sh" "$pr"

sha=$(git rev-parse HEAD)
git fetch --quiet origin main
git merge-base --is-ancestor origin/main "$sha" || fail "main moved while verifying. Run land again."

[ "$(jq -r .isDraft <<<"$meta")" = true ] && gh pr ready "$pr" --repo trakt/og
gh pr merge "$pr" --repo trakt/og --rebase --match-head-commit "$sha"
echo "land: merged PR #$pr at $(git rev-parse --short "$sha")"

if [ "$(gh issue view "$issue" --repo trakt/og-legacy --json state -q .state)" = OPEN ]; then
  gh issue close "$issue" --repo trakt/og-legacy --comment "Closed by https://github.com/trakt/og/pull/$pr after local verification."
fi
gh issue edit "$issue" --repo trakt/og-legacy --remove-label claimed --remove-label ready
"$(dirname "$0")/unblock.sh" "$issue"
echo "land: done. A human runs deno task client:deploy to update the site."
