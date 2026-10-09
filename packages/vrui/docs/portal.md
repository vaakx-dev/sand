# Portal

`portal(target, ...children)` mounts UI into another DOM node and leaves a
comment marker in the call-site tree. Cleanup follows the marker, the
surrounding scope, the target, and the portaled nodes.

The target can be a node or an element id string. String targets defer until
the element exists, matching `mount("id", ...)`.

```ts
import { button, div, portal } from "@vaakx-dev/vrui";

const view = div(
  "Page content",
  portal(
    "modals",
    div({ class: "modal" }, button({ onClick: close }, "Close")),
  ),
);
```

Use portals for modals, popovers, and other UI that must render outside the
local DOM position while keeping cleanup tied to the calling view.

Use a factory when the portaled UI needs local scoped work:

```ts
import { button, div, portal, sig } from "@vaakx-dev/vrui";

const view = div(
  portal("modals", () => {
    const open = sig(true);

    return div(
      { class: "modal" },
      button({ onClick: open.setter(false) }, "Close"),
    );
  }),
);
```
