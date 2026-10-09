# Store and Resources

## store

`store` wraps object fields as signals. Reading a property returns a `Sig` for
that field. Update fields through their signal methods.

```ts
import { div, input, store } from "@vaakx-dev/vrui";

const user = store({ name: "Ada", visits: 1 });

const profile = div(
  input({ value: user.name, onInput: user.name.fromInput() }),
  "Visits: ",
  user.visits,
);

user.visits.update((n) => n + 1);
```

Use `store` when an object-shaped state model is clearer than a set of separate
signals. It accepts a plain object, reads its own string and symbol fields once,
then returns a frozen plain object containing independent signals. Property
enumerability is preserved. Later changes to the initial object do not affect
the store.

## resource

`resource` runs an async fetcher, exposes `data`, `loading`, `error`,
`refetch`, and `dispose`, and passes an `AbortSignal` to cancel stale requests.

```ts
import { button, div, resource, show } from "@vaakx-dev/vrui";

const users = resource((signal) =>
  fetch("/api/users", { signal }).then((res) => res.json()),
);

const panel = div(
  button({ onClick: users.refetch }, "Reload"),
  show(users.loading, () => div("Loading...")),
  show(users.error.map(Boolean), () => div("Could not load users")),
  users.data.map((data) => JSON.stringify(data ?? [])),
);
```

Use `{ lazy: true }` to wait until `refetch()` before the first load.

Call `dispose()` on long-lived resources when they outlive their DOM scope.
