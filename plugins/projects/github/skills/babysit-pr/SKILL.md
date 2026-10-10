---
name: babysit-pr
description: 'Watch a PR and fix failures until it''s green. Trigger: "babysit".'
---

# Babysit PR

Stay with the PR until every required check and review bot passes on the
latest commit. Asking to babysit authorizes pushing fixes to the PR's branch.

1. Read the PR's goal and diff with `pr_status` and `gh pr diff`.
2. Call `pr_wait`. It returns when checks finish or feedback arrives, with
   failed log tails, unresolved threads and new comments.
3. Check each finding against the code before acting:
   - Right: fix it, run the relevant checks, commit with the commit skill and push.
   - Wrong: reply with a short reason, ending with `Replied by <model> in sand.`
   - Flaky infrastructure: rerun with `gh run rerun --failed`. Don't change code to hide it.
   - Need more log: `gh run view --log-failed`.
4. If the base branch moved and the PR needs it, rebase and push with
   `--force-with-lease`.
5. After every push, go back to step 2.

Keep changes within the PR's goal. If another PR makes this one obsolete, stop
and say so.

When it's green, reply with the URL and what you fixed. Merge only if asked,
with `gh pr merge --squash`.
