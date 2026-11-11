---
name: file-pr
description: 'Open or update a GitHub pull request. Trigger: "pr".'
---

# File PR

Rebase onto the base branch and read the full diff. If the branch has an open PR, update it.

Title it like a commit (the commit skill), under 60 characters in all, with `type` one of `feat`, `fix`, `perf`, `refactor` or `revert`.

Use the repository's PR template if it has one. Otherwise:

```markdown
<One sentence on what this PR does.>

## What

- <One change per line.>

| Before | After |
|---|---|
| ![<alt>](./before.png) | ![<alt>](./after.png) |

## Why

- <One reason per line.>

## Verification

- <What you ran and what you saw.>

Made by <model> in sand.
```

Leave out the table when nothing is visual. Use Desktop and Phone columns when that shows the change better. For a big PR, add a Review section saying where to start reading.

Create it with `gh pr create --title "<title>" --body-file <file>`. Link interactive pages with the postplan skill.

To wait for CI, call the `pr_checks` tool after pushing. It returns when the checks finish or one fails. Never `sleep` and poll `gh pr checks`.

Reply with the URL. This skill doesn't authorize merging.

## Images

`gh` uploads images and videos to GitHub itself. Never commit them or push them to a branch.

1. Save the screenshots next to the body file and run `gh` from that folder.
2. In the body, use markdown image syntax with the same relative path: `![<alt>](./after.png)`. Not `<img>` tags.
3. Pass each file with `--attach ./after.png`, on `gh pr create` or on `gh pr edit <number> --body-file <file>` to update. Up to 50 per command.

`gh` uploads each file and rewrites the matching `./` reference to the uploaded URL. A file the body doesn't reference is added at the end. If an upload fails, `gh` still makes or updates the PR but exits non-zero, so check that `gh pr view <number> --json body` shows `user-attachments` URLs and no `./` paths.
