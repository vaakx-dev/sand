import { div, list } from "@vaakx-dev/vrui";

import type { ViewStackItem, ViewStackOptions } from "../api.ts";
import { styled } from "../styled.ts";
import { valueOf } from "./menu.ts";

const Stack = styled(div, {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  display: "flex",
  overflow: "hidden",
});

const View = styled(div, {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  display: "flex",
  overflow: "hidden",
});

export function viewStack<T extends ViewStackItem>(options: ViewStackOptions<T>): HTMLElement {
  return list(
    options.items,
    (item) => item.id,
    (item) => View(
      { hidden: reactive(options.active, (active) => active !== item.get().id) },
      item.get().node,
    ),
    Stack({ hidden: reactive(options.active, (active) => active === null) }),
  );
}

function reactive<T, U>(
  value: T | (() => T) | { get(): T },
  map: (value: T) => U,
): U | (() => U) {
  return typeof value === "function"
    || (typeof value === "object" && value !== null && "get" in value)
    ? () => map(valueOf(value))
    : map(value);
}
