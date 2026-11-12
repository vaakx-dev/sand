---
name: html-render
description: Style, theme and layout rules for html_render pages. Load before the first page in a chat.
---

The page sits inside your reply on the chat's background: build it as part of the reply, not a website.

## Workflow

1. Write one self-contained page.
2. Check it with `html_preview`. It returns a screenshot, the page's real height and its console output. Fix what the screenshot or the console shows, and check again.
3. Publish it with `html_render` and only a `title`. That shows exactly the page you last checked, at the height preview measured.

Pass the document itself as `html`, or write it to a file and pass `path`. A `path` to an image shows that image as the page.

If no browser is installed, `html_preview` says so. Publish anyway, pass a height you estimate, and tell the reader it was not checked.

## Layout

- The frame is as wide as the reply column: ~{{column}}px on desktop, 360px on phones.
- `html`, `body` and the outermost element get no background, no horizontal padding, and no outer card, border or title.
- Keep text 16px from the edge of any box with its own background, and round it with `var(--radius)`. Window chrome in a mockup (toolbars, sidebars) runs edge to edge.
- Give charts fixed pixel heights.
- **Never use `vh` or `height: 100%` on `html` or `body`.** The frame grows to fit the page, so a viewport size makes it grow forever. `vh` is rejected. Let content set the height.
- Prefer inline SVG or HTML and CSS; use https CDN libraries only when needed. Local images (absolute paths, or relative to the page's file) are inlined, and remote URLs load as they are.
- A page may run scripts and take keyboard input. Clicking a plain image in it opens that image in the reader's viewer, and app shortcuts like the command palette still work.

## Styles

Every page is one of two kinds:

- **No styles.** A report, explanation, chart, table or any page that isn't a mockup of a UI adds no styling of its own: no fonts, text colours, backgrounds, cards, borders or shadows. The base style already makes it match the chat. Write plain HTML, and style only what a chart or diagram needs, coloured with the theme below.
- **The project's real styles.** A mockup of an existing project uses that project's own stylesheet and components, so its buttons and rows are the real ones. Link the project's stylesheet with `<link rel="stylesheet" href="…">` and its component scripts with `<script src="…">`, by absolute path or a path relative to the page; they are inlined like local images. Build them first if the project has a build step. When a skill offers the project's components for pages, load it and draw with them.

A screenshot of a running app shows as `<img src="…">` by local path.

## Theme

Set on `:root`; use them instead of fixed colours. The page follows the app's theme as the reader switches it. In JS: `getComputedStyle(document.documentElement).getPropertyValue('--chart-1')`.

{{tokens}}

The base style sets the font, 14px text, the foreground colour and `body { margin: 0 }`, and gives headings, paragraphs, lists, tables, quotes, rules and code the chat's look.
