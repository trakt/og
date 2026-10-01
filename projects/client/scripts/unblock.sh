#!/usr/bin/env bash
# Mark every open issue whose `Blocked by:` issues are all closed as `ready`. The local twin of the old
# unblock workflow; `deno task land` runs it after each merge.
# Usage: deno task unblock [closed-issue-number ...]   (no arguments: check every open issue)
set -euo pipefail

if [ $# -gt 0 ]; then
  candidates=$(for n in "$@"; do gh issue list --repo trakt/og-legacy --state open --search "\"#$n\" in:body -label:ready -label:blocked" --limit 200 --json number,body; done | jq -s 'add | unique_by(.number)')
else
  candidates=$(gh issue list --repo trakt/og-legacy --state open --search "-label:ready -label:blocked" --limit 500 --json number,body)
fi

jq -r '.[] | [.number, ((.body | capture("(?im)^Blocked by:(?<b>[^\n]*)").b // "") | [scan("#([0-9]+)") | .[0]] | join(" "))] | @tsv' <<<"$candidates" |
  while IFS=$'\t' read -r n blockers; do
    [ -z "$blockers" ] && continue
    open=0
    for b in $blockers; do
      [ "$(gh issue view --repo trakt/og-legacy "$b" --json state -q .state)" = OPEN ] && { open=1; break; }
    done
    if [ "$open" = 0 ]; then
      gh issue edit --repo trakt/og-legacy "$n" --add-label ready >/dev/null
      echo "unblock: #$n ready"
    fi
  done
