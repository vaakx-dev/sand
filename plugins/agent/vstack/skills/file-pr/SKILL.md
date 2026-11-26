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

![<Screen> before and after: <change 1> (1); <change 2> (2)](./<screen>-before-after.png)

## Why

- <One reason per line.>

## Verification

- <What you ran and what you saw.>

Made by <model> in sand.
```

Leave out the images when nothing is visual. For a big PR, add a Review section saying where to start reading.

Create it with `gh pr create --title "<title>" --body-file <file>`. Link interactive pages with the postplan skill.

To wait for CI, call the `pr_checks` tool after pushing; if it isn't loaded, `find_tools("github")` loads it. It returns when the checks finish or one fails.

Reply with the URL. This skill doesn't authorize merging.

## Before and after

Never put before and after screenshots in a markdown table. Stitch each pair into one image, one image per screen, with `scripts/stitch.py` in this skill's folder (Python 3 with Pillow).

- **Layout**: tall shots go side by side, wide shots stack top to bottom. The script picks this from the cropped shape.
- **Crop**: the same crop on both halves, trimmed to the part that changed and free of empty space.
- **Callouts**: amber boxes, dashed on Before and solid on After, with the same numbered badge on both. Use a side bracket for a change across the whole layout. Leave space between the box and the element so a removed border or edge stays visible; the script draws each box 8px outside the bounds you give.
- **What to mark**: only what visibly changed. Behaviour changes go in the text.
- **Legend**: one line per number, inside the image. The alt text repeats the numbered list.

The script draws the dark frame (`#181a1e`), a subtle border on each shot, the title, the Before and After headings, the callouts (`#FFB800`) and the legend. Write a spec next to the body file:

```json
{
  "before": "settings-before.png",
  "after": "settings-after.png",
  "out": "settings-before-after.png",
  "title": "Settings, dark",
  "labels": ["main", "this branch"],
  "crop": [0, 0, 2746, 1500],
  "marks": [
    {"n": 1, "box": [2266, 152, 2486, 236]},
    {"n": 2, "box": {"before": [36, 118, 366, 184], "after": [33, 104, 369, 169]}},
    {"n": 3, "bracket": {"before": [420, 178, 1500], "after": [400, 130, 1442]}}
  ],
  "legend": ["Tiles are monochrome", "No outer borders on fields", "Tighter page, so Site zoom fits"]
}
```

Then run `python <skill folder>/scripts/stitch.py settings.json`. Coordinates are pixels in the original screenshots. A box is `[x0, y0, x1, y1]` and a bracket is `[x, y0, y1]`. Give `before` and `after` when the spot moved, and leave one out to mark one half only. `layout` (`auto`, `side` or `stack`) overrides the shape rule. `--help` shows the same options as flags. The script prints a markdown line with the alt text for the body.

Read the image back before attaching it. Check that each box sits on its element on both halves, that no badge, box, bracket or line of text overlaps another or covers the change, and that the legend reads at GitHub's width. Fix the spec and rerun until it does.

## Images

`gh` uploads images and videos to GitHub itself. Never commit them or push them to a branch.

1. Save the stitched images next to the body file and run `gh` from that folder.
2. In the body, use markdown image syntax with the same relative path: `![<alt>](./menu-before-after.png)`. Not `<img>` tags.
3. Pass each file with `--attach ./menu-before-after.png`, on `gh pr create` or on `gh pr edit <number> --body-file <file>` to update. Up to 50 per command.

`gh` uploads each file and rewrites the matching `./` reference to the uploaded URL. A file the body doesn't reference is added at the end. If an upload fails, `gh` still makes or updates the PR but exits non-zero, so check that `gh pr view <number> --json body` shows `user-attachments` URLs and no `./` paths.
