# DOM Factories

Factories create real DOM nodes:

```ts
import { button, div, input, sig } from "@vaakx-dev/vrui";

const enabled = sig(true);

const view = div(
  { class: ["panel", { enabled }] },
  input({ placeholder: "Name" }),
  button({ disabled: enabled.map((value) => !value) }, "Save"),
);
```

Common factories include `div`, `span`, `button`, `input`, `form`, `label`,
`textarea`, `select`, `option`, `a`, `img`, `dialog`, `canvas`, headings,
lists, tables, sectioning elements, and semantic text helpers such as `strong`,
`em`, and `small`.

Use `el(tag, props, ...children)` for custom or uncommon tags.

## Props

Props can be plain values or reactive values. Supported patterns include:

- `class`
- `style`
- `text`
- `data-*`
- `aria-*`
- `role`
- `value` on inputs
- normal DOM properties such as `disabled`
- event props such as `onClick`
- lifecycle props such as `ref` and `onMount`

Props are element-specific and closed: DOM property values retain their browser
types, form bindings are only accepted on compatible controls, and misspelled
properties or events fail type checking. Use `ref`, `onMount`, or `listen` for
custom browser and third-party integration work.

## Children

Children can be nodes, strings, numbers, booleans, nullish values, arrays, or
reactive values. Reactive children update a text node when the signal or derive
changes.

```ts
import { div, sig } from "@vaakx-dev/vrui";

const count = sig(1);
const view = div("Count: ", count);

count.set(2);
```

## Mounting

Use `mount(target, ...children)` for app roots. The target can be a node or an
element id string. It returns a disposer that removes mounted children and
disposes scoped work created while mounting.

```ts
import { div, mount } from "@vaakx-dev/vrui";

const stop = mount("app", div("Hello"));
stop();
```

`byId(id)` returns a required element or throws.
