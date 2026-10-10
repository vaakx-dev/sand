---
name: file-pr
description: 'Open or update a GitHub pull request. Trigger: "pr".'
---

# File PR

Rebase onto the base branch, read the full diff and run the project's checks. If the branch has an open PR, update it.

Title it like a commit: one change, what is now true, under 60 characters.

Use the repository's PR template if it has one. Otherwise:

```markdown
<What was broken for the user, and the cause.>

<What a reviewer needs that the diff doesn't show.>

| Before | After |
|---|---|
| ![<alt>](./before.png) | ![<alt>](./after.png) |

Tested: <what you ran and what you saw>

Not tested: <gaps in this change>

Made by <model> in sand.
```

Leave out any line with nothing to say. Keep the screenshots for UI changes.

Create it with `gh pr create --title "<title>" --body-file <file>`, adding `--attach <file>` for each screenshot. Never commit them. Link interactive pages with the postplan skill.

Reply with the URL. This skill doesn't authorize merging.
