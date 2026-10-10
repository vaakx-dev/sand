---
name: commit
description: Make a Git commit.
---

# Commit

Title it `type(scope): what is now true`.

```text
fix(auth): repeated failed logins pause sign-in
```

The title is usually enough. Add a body only for what the diff doesn't show, as `- ` bullets after a blank line.

| Type | Meaning |
|---|---|
| `feat` | New functionality |
| `fix` | Bug fix |
| `refactor` | Restructuring without behavior changes |
| `perf` | Performance improvement |
| `docs` | Documentation |
| `test` | Tests |
| `style` | Code formatting, not UI design |
| `build` | Build tooling or dependencies |
| `ci` | Continuous integration |
| `chore` | Other maintenance |
| `revert` | Revert an earlier commit |

Leave out AI attribution, such as Co-authored-by trailers and model names.

If someone else made the changes, check `git status` and the staged diff, commit only what was meant, and check the result.

This skill doesn't authorize amending or pushing.
