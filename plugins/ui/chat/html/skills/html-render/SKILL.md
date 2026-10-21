---
name: html-render
description: Theme and layout rules for html_render pages. Load before the first page in a chat.
---

The page sits inside your reply on the chat's background: build it as part of the reply, not a website.

## Workflow

Write one self-contained page to a file, for example under /tmp, and pass its `path` to `html_render`.

## Layout

- The frame is borderless and as wide as the reply column: ~{{column}}px on desktop, 360px on phones.
- `html`, `body` and the outermost element get no background, no horizontal padding, and no outer card, border or title.
- Keep text 16px from the edge of any box with its own background, and round it with `var(--radius)`. Window chrome in a mockup (toolbars, sidebars) runs edge to edge.
- Give charts fixed pixel heights. No `100vh` or `height: 100%` on `html` or `body`. Frames stop at {{max_height}}px.
- Prefer inline SVG or HTML and CSS; use https CDN libraries only when needed. Local images (absolute paths, or relative to the page's file) are inlined.

## Mockups

Use the project's real copy, structure, icons and colours. Label alternative treatments A, B, C and change only what differs. A mock of another app uses that app's colours and fonts; sand mockups, charts and diagrams use the theme below.

## Theme

Set on `:root`; use them instead of fixed colours. In JS: `getComputedStyle(document.documentElement).getPropertyValue('--chart-1')`.

{{tokens}}

The base style sets the font, 14px text, the foreground colour and `body { margin: 0 }`.
