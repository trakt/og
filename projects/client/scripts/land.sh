#!/usr/bin/env bash
# Rebase, verify and merge a public PR, then close the issues named in its body.
# Run from the PR branch: deno task client:land <pr>.
set -euo pipefail

[ "$#" = 1 ] || { echo 'usage: land <pr>' >&2; exit 1; }
pr="$1"
fail() { echo "land: $*" >&2; exit 1; }
[[ "$pr" =~ ^[0-9]+$ ]] || fail "the PR number must be digits"

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
jq -e 'any(.labels[]; .name == "wontfix")' <<<"$meta" >/dev/null && fail "PR #$pr is labelled wontfix"
issues=$(jq -r .body <<<"$meta" | python3 -c '
import re
import sys

body = sys.stdin.read()
references = re.findall(r"\bCloses[ \t]+(#[0-9]+\b(?:[ \t]*(?:,[ \t]*(?:and[ \t]+)?|and[ \t]+)#[0-9]+\b)*)", body, re.I)
issues = sorted({int(n) for reference in references for n in re.findall(r"#([0-9]+)", reference)})
if not issues and not re.search(r"^No issue:[ \t]*\S.*$", body, re.M):
    sys.exit("land: PR body must include Closes #N or a No issue: <why> line")
print(" ".join(map(str, issues)))
')
# Refuse a missing issue before any rebase, push or merge.
for issue in $issues; do
  gh issue view "$issue" --repo trakt/og --json state -q .state >/dev/null
done

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

for issue in $issues; do
  if [ "$(gh issue view "$issue" --repo trakt/og --json state -q .state)" = OPEN ]; then
    gh issue close "$issue" --repo trakt/og --comment "Closed by https://github.com/trakt/og/pull/$pr after local verification."
  fi
done
echo "land: done. A human runs deno task client:deploy to update the site."
