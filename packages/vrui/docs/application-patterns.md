# Application structure

VRUI applications keep domain state independent from browser code and give
every browser side effect an element or active scope that owns its lifetime.

## Small applications

Keep a small application together while it is still easy to read:

```text
feature/
  index.html
  main.ts
  model.ts
  view.ts
```

`model.ts` owns state, derived values, and domain actions. It can be tested
without rendering a page.

`view.ts` creates elements, binds state, renders flow, and declares browser
work. Private component functions can stay in the same file while they only
serve that view.

`main.ts` composes the application, selects a color theme, and mounts the root.

## State and view

```ts
// model.ts
import { derive, sig } from "@vaakx-dev/vrui";

export function create_profile() {
  const name = sig("");
  const can_save = derive(() => name.get().trim().length > 0);

  function save() {
    if (!can_save.get()) return;
    persist({ name: name.get() });
  }

  return { can_save, name, save };
}
```

```ts
// view.ts
import { button, form, input, preventThen } from "@vaakx-dev/vrui";

export function profile_view(model: ProfileModel) {
  return form(
    { onSubmit: preventThen(model.save) },
    input({ bindValue: model.name }),
    button({
      disabled: model.can_save.map((value) => !value),
      type: "submit",
    }, "Save"),
  );
}
```

The model describes what saving means. The view describes how browser input
reaches it.

## Larger applications

Split a project along real ownership boundaries. A feature folder owns a part
of the domain and its view. An application component owns a visual or
interactive shape reused across features.

```text
application/
  components/
    action.ts
    badge.ts
    field.ts
    panel.ts
  orders/
    editor.ts
    model.ts
    row.ts
    view.ts
  parts/
    model.ts
    row.ts
    view.ts
  main.ts
  model.ts
  view.ts
```

The root model composes feature models. The root view handles application-level
navigation and renders the active feature. Feature models do not depend on one
another's views.

## Application components

A reusable component is a function that returns a VRUI element. It owns the
utility composition and interaction contract for that element:

```ts
import { button, type Child, type Props } from "@vaakx-dev/vrui";

export function primary_action(
  props: Props<HTMLButtonElement>,
  ...children: Child[]
) {
  const { class: class_name, ...button_props } = props;

  return button(
    {
      ...button_props,
      class: [
        "inline-flex items-center gap-2 rounded-lg px-4 py-2",
        "bg-accent-600 text-sm font-semibold text-white",
        "hover:bg-accent-700 focus-visible:ring-2 disabled:opacity-50",
        class_name,
      ],
    },
    ...children,
  );
}
```

Callers use `primary_action({ onClick: model.save }, "Save")`. The name is
searchable, the element remains typed, and repeated class strings do not become
a parallel UI API.

Keep a component inside its feature when only that feature uses it. Move it to
the nearest shared `components` folder when two features share the same UI
contract.

## Interaction routes

| Need | VRUI route |
| --- | --- |
| Element event | typed event prop such as `onClick`, `onInput`, or `onKeyDown` |
| Form state | `bindValue` or `bindChecked` |
| Form submission | `onSubmit: preventThen(action)` |
| Key mapping | `keys({ Escape: close, Enter: submit })` |
| Window event | `onWindow(owner, event, handler)` |
| Document event | `onDocument(owner, event, handler)` |
| Custom or third-party event | `onTarget` or `listen` |
| Timer or animation frame | `onTimeout`, `onInterval`, or `onRaf` |
| Resize or media state | `onResize`, `onMedia`, or `resizeObserver` |
| Conditional UI | `show` or `keep` |
| Repeated UI | keyed `list` |
| Imperative integration | `ref` or `onMount` with cleanup |

## Element events

```ts
button({ onClick: model.save }, "Save");

div({
  onKeyDown: keys({
    Escape: model.close,
    Enter: model.choose,
  }),
});
```

Event props are typed from the element. Event helpers keep common preventing,
stopping, and key routing visible at the declaration.

## Window and document work

The owner element defines the lifetime:

```ts
const panel = div({
  onMount: (owner) => {
    onWindow(owner, "resize", model.measure);
    onDocument(owner, "keydown", model.shortcut);
  },
});
```

Both registrations are released when `panel` disconnects.

## Timers and observers

```ts
const dashboard = div({
  onMount: (owner) => {
    const stop_refresh = onInterval(model.refresh, 30_000);
    resizeObserver(owner, model.resize);
    return stop_refresh;
  },
});
```

The mounted view owns the schedule and observation. The model owns what a
refresh or resize means.

## Integration boundaries

Keep imperative platform or third-party setup in a focused integration
function:

```ts
// integrations/chart.ts
export function chart(node: HTMLCanvasElement, data: ChartData) {
  const instance = create_chart(node, data);
  return () => instance.destroy();
}
```

```ts
// view.ts
canvas({
  onMount: (node) => chart(node, model.chart_data.get()),
});
```

The view remains VRUI-shaped while the integration keeps its native contract.

## Source conventions

Keep application source free of:

- browser operations that bypass the application routes above
- arbitrary utility values outside the built-in scale
- exact and near-duplicate utility shapes within an application

When a shape repeats, extract the actual VRUI element into the nearest feature
or application component. Focused `integrations` folders are explicit
native-platform boundaries.
