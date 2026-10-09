# VRUI Application Conventions

Write application interfaces as VRUI code.

## Start small

A small application normally needs:

```text
feature/
  main.ts
  model.ts
  view.ts
```

- `model.ts` owns state, derived values, and domain actions.
- `view.ts` owns elements, bindings, flow, events, and lifecycle.
- `main.ts` composes the application, selects the color theme, and mounts it.

One cohesive `view.ts` is preferable while the interface remains easy to
understand as a whole.

## Grow by ownership

Create a feature folder when it owns a model and view of its own. Create a
component when a real UI shape or behavior is reused.

```text
application/
  components/
    action.ts
    field.ts
    panel.ts
  orders/
    editor.ts
    model.ts
    row.ts
    view.ts
  main.ts
  model.ts
  view.ts
```

Components are functions that return VRUI elements. Keep their utility classes
inside the component that owns the shape. Do not build a separate catalog of
class-name strings.

Keep actions in models and route view events to those actions. Keep theme
selection at the mount boundary. Themes assign colors; spacing, sizing, type,
radii, shadows, and breakpoints come from the built-in utility scales.

## UI routes

Choose the VRUI path that matches the application intent:

| Intent | Route |
| --- | --- |
| Elements | typed factories such as `div`, `button`, `input`, `form`, `table`, and `svg` |
| Reactive state and props | `sig`, `derive`, `effect`, reactive children, and reactive props |
| Forms | `bindValue`, `bindChecked`, `onSubmit`, and `preventThen` |
| Element interaction | typed event props and `keys`, `event`, `stopThen`, or `preventThen` |
| Conditional and repeated UI | `show`, `keep`, `dynamicChild`, and keyed `list` |
| Window or document interaction | `onWindow` and `onDocument` |
| Target or custom interaction | `onTarget` and `listen` |
| Delayed browser work | `onTimeout`, `onInterval`, and `onRaf` |
| Browser observation | `onResize`, `onMedia`, `resizeObserver`, and `intersectionObserver` |
| Imperative integration | `ref` or `onMount`, returning cleanup |

Every browser side effect belongs to a VRUI element or active scope. Keep setup
and cleanup together at that ownership boundary.

Canvas, measurement, custom-element, and third-party widget code belongs in a
focused `integrations` module. Expose a small VRUI-facing function and keep the
native platform contract inside that boundary.

## Utilities

Compose UI from known runtime utilities. Reuse the built-in scales and variants
instead of introducing one-off values. When a utility shape repeats, extract
the actual element into the nearest application `components` folder.

## Verification

Run `bun run check` from the repo root.

Read `docs/application-patterns.md` when choosing a project boundary, event,
lifecycle, flow, or integration shape.
