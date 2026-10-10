---
name: file-pr
description: 'Use when opening or updating a GitHub pull request. Explicit trigger: “pr.”'
---

# File PR

Rebase onto the base branch, read the full diff and run the project's checks.
If the branch already has an open PR, update it instead of opening another.

Title it like a commit, saying what is now true:

```text
fix(auth): repeated failed logins pause sign-in for a minute
```

Use the repository's PR template if it has one. Otherwise:

```markdown
<What was wrong, as a user sees it, and why.>

<What happens now.>

## Change

- **<Layer>:** <what changed>

## Verification

- `<command>` passes (<n>/<n>).

| Before | After |
|---|---|
| ![<alt>](./before.png) | ![<alt>](./after.png) |

**Not checked:** <what wasn't tested>

Made by <model> in sand.
```

Drop any part with nothing to say. Only list checks you ran.

Create it with `gh pr create --title "<title>" --body-file <file>`, adding `--attach <file>` for each screenshot or video, then reply with the URL. Never commit PR screenshots. For an interactive page, upload it with the postplan skill and link it.

This skill does not authorize merging.
