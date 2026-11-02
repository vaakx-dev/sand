---
name: postplan
description: 'Share an HTML page by link, or read a postplan.dev URL. Trigger: "postplan".'
---

# Postplan

Upload one self-contained HTML file and share the URL it prints:

```text
npx postplan upload <file>
```

Uploading the same file again updates the same URL. Add `--new` for a new one.

To read a postplan.dev URL, curl it with `/raw` added to the end.

Pages are public to anyone with the link. Ask before uploading anything private.

If a command fails, stop and tell the user what it printed. If it needs a login, tell them to run `npx postplan auth login`.
