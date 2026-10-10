---
name: file-pr
description: 'Open or update a GitHub pull request. Trigger: "pr".'
---

# File PR

Rebase onto the base branch and read the full diff. If the branch has an open PR, update it.

Title it like a commit: one change, what is now true, under 60 characters.

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

Create it with `gh pr create --title "<title>" --body-file <file>`, adding `--attach <file>` for each screenshot. Never commit them. Link interactive pages with the postplan skill.

Reply with the URL. This skill doesn't authorize merging.
