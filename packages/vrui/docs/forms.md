# Forms

Use `bindValue` and `bindChecked` for common form state.

```ts
import { input, option, select, sig, textarea } from "@vaakx-dev/vrui";

const name = sig("Ada");
const enabled = sig(false);
const role = sig("admin");

input({ bindValue: name });
textarea({ bindValue: name });
input({ type: "checkbox", bindChecked: enabled });
select(
  { bindValue: role },
  option({ value: "admin" }, "Admin"),
  option({ value: "viewer" }, "Viewer"),
);
```

`bindValue` works on `input`, `textarea`, and `select`.

`bindChecked` works on `input` and stores a boolean.

For one-way input values, pass a reactive `value` prop:

```ts
import { input, sig } from "@vaakx-dev/vrui";

const value = sig("read only");
const field = input({ value });
```

For custom input handling, use `onInput` or `Sig.fromInput()`.
