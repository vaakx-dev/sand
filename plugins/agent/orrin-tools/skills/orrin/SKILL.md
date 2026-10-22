---
name: orrin
description: Find, read, edit, build and land through Orrin. Load before changing or building files in an Orrin project.
---

# Orrin

Orrin owns this project's files, views, builds and history. Ask it instead of the disk.

## Find and read

- `find` for files by name, `search` for text, `outline` for the shape of any file (code, docs, slides, scenes), `where` for installed tools.
- `read` a slice or an anchor from `outline` or `search`, not whole big files.
- Never scan the disk or print files with shell (`ls`, `cat`, `head`, `find`, `grep`). One `read` slice beats dumping a folder.

## Change

- Edit with `patch`, `write`, `move` and `delete`. They go into your own view, so other agents don't see them until you land.
- Use paths relative to the project root.

## Build and check

- Build, run, test and take screenshots with the targets in `orrin.toml`. Don't run build tools directly.
- Repeats come from the cache, so build as often as you need.
- Show screenshots to the user when they show the result.

## Land

- Land when your job is done, with a short note of what changed.
- If landing returns conflicts, fix those files in your view and land again.
- Helpers that edit land into their thread's view; threads land to main.
