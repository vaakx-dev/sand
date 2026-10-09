# Flow Helpers

VRUI provides `dynamicChild`, `show`, `keep`, and `list` for dynamic UI.

## dynamicChild

`dynamicChild(value, factory)` replaces one child when its driving value
changes.

```ts
import { div, dynamicChild, sig } from "@vaakx-dev/vrui";

const mode = sig("summary");

const view = dynamicChild(mode, (value) => div(value));
```

The factory is built without tracking incidental signal reads. Reading a local
signal in the factory does not make that local signal a remount trigger.

State created inside the factory is local to that child instance. When the
driving value changes, VRUI disposes the old child scope, removes the old child,
and creates a new child. Local state is recreated.

Reactive props and reactive children inside the returned child still update
normally without remounting the child.

## show

`show(condition, factory)` lazily creates a node when the condition is true and
disposes it when hidden. Use it when rebuilding is cheap or cleanup on hide is
desired.

## keep

`keep(condition, factory)` lazily creates a node on the first true value, keeps
it mounted, and toggles `display` while hidden. Use it when state should survive
visibility changes, such as canvas pixels, scroll position, or an open
subscription.

## list

`list(data, keyFn, factory, container?)` renders keyed arrays and reuses rows
by key. The row factory receives an item signal and index signal, so reused rows
update without recreating their local scope.
