---
name: commit
description: 'Use when preparing or making a Git commit. Explicit trigger: “commit.”'
---

# Commit

Use `type(scope): short summary`, for example:

```text
feat(server): added health endpoint
```

The title is usually enough. Only add a body when important detail needs explaining. Leave a blank line, then use `- ` bullets that add information rather than repeat the title.

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

Do not add AI attribution: no `Co-authored-by` trailers, "Generated with" lines, or mentions of the model or agent.

If you did not make the changes yourself, inspect repository status and the staged diff first, commit only intended changes, and check the resulting commit.

Before committing, propose the message and the files it covers, then wait for the user to approve. If the request includes `-y`, commit without asking.

This skill does not authorize amending or pushing by itself.
