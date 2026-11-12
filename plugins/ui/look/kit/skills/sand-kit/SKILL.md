---
name: sand-kit
description: Sand's real buttons, rows, menus and icons for an HTML page. Load before a quick mockup of a sand screen.
---

A quick mockup of sand draws with sand's own kit, so its buttons, rows, spacing and type are the real ones. Never restyle sand by hand in CSS.

Include the kit script in the body, then build the page with it:

```html
<body>
<script src="{{script}}"></script>
<script>
  const { kit, vrui } = sandKit
  vrui.mount(
    document.body,
    kit.pageSection(
      { title: 'Accounts', action: kit.secondaryAction({ size: 'sm' }, 'Add') },
      kit.listRow({ surface: 'group', title: 'Claude', meta: 'Signed in', onClick: () => {} }),
    ),
  )
</script>
</body>
```

- `kit` holds every component sand's screens draw with. `{{kit}}` lists them, and the files it imports give their props.
- `{{example}}` builds each component with sample props. Start from it.
- `vrui` holds the element factories (`div`, `span`, `section` and the rest) and `mount`. Lay components out with the utility classes sand's screens use, like `flex flex-col gap-3`.
- Take a screen's structure, copy and classes from the code that draws it, under `{{plugins}}`.
- Colours follow the reader's theme. Add no stylesheet and no theme variables of your own.
