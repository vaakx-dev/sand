# Reactivity

Use `sig` for mutable state, `derive` for read-only computed state, `effect`
for side effects, and `batch` to group updates so dependent effects run once.

Updates are synchronous. VRUI settles every affected derive before running user
effects, so an effect never observes a mixture of old and new computed values.
An effect that depends on both a source and its derive runs once for that
transaction.

```ts
import { batch, derive, effect, sig } from "@vaakx-dev/vrui";

const first = sig("Ada");
const last = sig("Lovelace");
const full = derive(() => `${first.get()} ${last.get()}`);

const stop = effect(() => {
  console.log(full.get());
});

batch(() => {
  first.set("Grace");
  last.set("Hopper");
});

stop();
```

If reactive work throws, VRUI still drains the queued transaction before
reporting the error. Cleanup likewise attempts every owned disposer, reporting
multiple failures with `AggregateError` after teardown completes. A failed
derive propagates that failure to its readers until it recomputes successfully;
VRUI does not expose its last value as if it belonged to the new transaction.

Signals include helpers such as `update`, `toggle`, `setter`, `fromInput`,
`map`, `eq`, `prop`, `or`, `index`, and `filter`.

## Reactive UI

Factory props and children can read signals directly:

```ts
import { button, div, sig } from "@vaakx-dev/vrui";

const active = sig(false);

const view = div(
  { class: ["panel", { active }] },
  button({ onClick: active.toggle() }, active.map((value) => value ? "On" : "Off")),
);
```

The reactive work is cleaned up when the node disconnects or when its owning
scope is disposed.
