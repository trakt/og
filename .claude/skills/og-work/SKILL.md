---
name: og-work
description: "Work one trakt/og issue end to end: take it (assign yourself), build it in its own worktree, land it with deno task client:land. Trigger on /og-work, 'work the board', 'pick up an og issue'."
---

# Work one og issue

1. Read the root `AGENTS.md`. Use trakt/og's issues and GitHub's standard labels plus `allowlist-change`.
2. Take the specific issue you are handed. Without one, select the oldest open issue with no assignee. To find it, use `gh api --paginate 'repos/trakt/og/issues?state=open&sort=created&direction=asc&per_page=100' --jq '.[] | select(.pull_request == null and (.assignees | length) == 0) | .number'` and take the first number. Recheck its assignees before taking it; never pick an assigned issue. Assign yourself with `gh issue edit N --repo trakt/og --add-assignee @me`. One agent owns one issue. When agents share a GitHub login, the person or orchestrator starting them hands each its own issue.
3. Fetch `origin` and create a dedicated worktree and branch off `origin/main`. Run `deno task install`. Open a draft PR early on trakt/og with `Closes #N` in the body.
4. Build according to `AGENTS.md` and the matching `.agents/rules/`, including design-system, accessibility and testing rules. Run `deno task client:ci` while working. If part has no API path and no other workable way, cut that part, explain it in the PR and ship the rest.
5. Keep PR titles, bodies, commits and comments public-safe: no private implementation details or local paths. For visual work, use the `og-upload` skill if it exists in this repo; otherwise describe the visuals and any deviations in the PR.
6. Commit with a conventional message, push the branch and ship with `deno task client:land <pr>`. It rebases, verifies (including the leak check), merges the verified commit and closes the issue. Never push to main or run `gh pr merge` directly. Never deploy; humans run `deno task client:deploy`.
7. If you need a human, comment on the issue with what's needed, unassign yourself with `gh issue edit N --repo trakt/og --remove-assignee @me`, and stop. If giving up, leave a one-line reason and unassign yourself. Report the issue, PR URL, merge state, validation and any cuts; after landing, remove the worktree.
