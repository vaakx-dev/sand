# Lifecycle and Cleanup

Lifecycle and browser side-effect helpers keep cleanup tied to scopes or node
disconnects.

## Mounting

`mount(target, ...children)` mounts children into a node or id target and
returns a disposer.

```ts
import { div, mount } from "@vaakx-dev/vrui";

const stop = mount("app", div("Hello"));
stop();
```

If the id target does not exist yet, mounting is deferred until it appears. The
returned disposer cancels the pending mount or unmounts mounted children.

## onMount

`onMount` runs when a node is connected. If the callback returns a cleanup
function, that cleanup runs when the node disconnects. `onMount` itself
returns a disposer that cancels a pending mount or runs the mounted cleanup.

```ts
import { div } from "@vaakx-dev/vrui";

const panel = div({
  onMount: () => {
    start();
    return stop;
  },
});
```

## Cleanup helpers

`onDisconnect(node, cleanup)` waits for a real mounted lifetime: a newly
created detached node is not treated as disconnected. Its returned function
cancels the registration without running the cleanup.

Available helpers include:

- `listen`
- `onDisconnect`
- `onWindow`
- `onDocument`
- `onTarget`
- `onTimeout`
- `onInterval`
- `onRaf`
- `onResize`
- `onMedia`
- `resizeObserver`
- `intersectionObserver`

Listener helpers tied to an owner node, including `onTarget`, `onWindow`,
`onDocument`, `onResize`, return a disposer for explicit early cleanup as
well as cleaning up when the owner disconnects.

Example:

```ts
import {
  div,
  onInterval,
  onMedia,
  onResize,
  resizeObserver,
} from "@vaakx-dev/vrui";

const panel = div({
  onMount: (el) => {
    onResize(el, recalcLayout);
    resizeObserver(el, recalcPanel);
    const stopRefresh = onInterval(refresh, 30_000);
    const stopMedia = onMedia("(prefers-reduced-motion: reduce)", (matches) => {
      reducedMotion.set(matches);
    });

    return () => {
      stopRefresh();
      stopMedia();
    };
  },
});
```

Effects created inside active scopes are disposed with that scope. DOM reactive
props and event handlers are cleaned up when the node disconnects or when an
active scope is disposed.
