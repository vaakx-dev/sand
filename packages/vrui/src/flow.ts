// ============================================================
// vrui - flow control (list, show)
// ============================================================

import { batch, Condition, Derive, effect, resolve, sig, Sig, untrack } from "./core";
import { autoDispose } from "./lifecycle";
import { collectScope, disposeAll, type Disposer } from "./scope";

/* ---------- dynamicChild ---------- */

type DynamicChildValue<T> = Sig<T> | Derive<T> | Condition | (() => T);

function resolveDynamicChild<T>(value: DynamicChildValue<T>): T {
  return value instanceof Condition ? value.get() as T : resolve(value);
}

export function dynamicChild<T>(
  value: DynamicChildValue<T>,
  factory: (value: T) => HTMLElement,
  container?: HTMLElement,
): HTMLElement {
  const node = container ?? document.createElement("div");
  if (!container) node.style.display = "contents";

  let child: HTMLElement | null = null;
  let childScope: Disposer[] = [];

  const disposeEff = effect(() => {
    const next = resolveDynamicChild(value);
    const created = untrack(() => collectScope(() => factory(next)));
    child = created.value;
    childScope = created.scope;
    node.appendChild(child);

    return () => {
      if (child?.parentNode === node) node.removeChild(child);
      disposeAll(childScope);
      childScope = [];
      child = null;
    };
  });

  autoDispose(node, disposeEff);

  return node;
}

/* ---------- list ---------- */

type ListRow<T, K> = {
  el: HTMLElement;
  item: Sig<T>;
  idx: Sig<number>;
  key: K;
  scope: Disposer[];
};

function poolRow<T, K>(pool: Map<K, ListRow<T, K>[]>, row: ListRow<T, K>): void {
  const rows = pool.get(row.key);
  if (!rows) {
    pool.set(row.key, [row]);
    return;
  }

  rows.push(row);
}

function takePooledRow<T, K>(
  pool: Map<K, ListRow<T, K>[]>,
  key: K,
): ListRow<T, K> | undefined {
  const rows = pool.get(key);
  if (!rows) return undefined;

  const row = rows.shift();
  if (!rows.length) pool.delete(key);
  return row;
}

function disposeRow<T, K>(row: ListRow<T, K>): void {
  row.el.remove();
  disposeAll(row.scope);
  row.item.dispose();
  row.idx.dispose();
}

function disposeRows<T, K>(rows: Iterable<ListRow<T, K>>): void {
  for (const row of rows) disposeRow(row);
}

function disposePool<T, K>(pool: Map<K, ListRow<T, K>[]>): void {
  for (const rows of pool.values()) disposeRows(rows);
}

function createRow<T, K>(
  item: T,
  index: number,
  key: K,
  factory: (item: Sig<T>, idx: Sig<number>) => HTMLElement,
): ListRow<T, K> {
  const itemSig = sig(item);
  const idxSig = sig(index);
  const created = collectScope(() => factory(itemSig, idxSig));
  return { el: created.value, item: itemSig, idx: idxSig, key, scope: created.scope };
}

function updateRow<T, K>(row: ListRow<T, K>, item: T, index: number): void {
  batch(() => {
    row.item.set(item);
    row.idx.set(index);
  });
}

function reuseOrCreateRow<T, K>(
  pool: Map<K, ListRow<T, K>[]>,
  item: T,
  index: number,
  key: K,
  factory: (item: Sig<T>, idx: Sig<number>) => HTMLElement,
): ListRow<T, K> {
  const row = takePooledRow(pool, key);
  if (!row) return createRow(item, index, key, factory);

  updateRow(row, item, index);
  return row;
}

export function list<T, K>(
  data: Sig<T[]> | Derive<T[]>,
  keyFn: (item: T) => K,
  factory: (item: Sig<T>, idx: Sig<number>) => HTMLElement,
  container?: HTMLElement
): HTMLElement {
  const node = container ?? document.createElement("div");
  let rows: ListRow<T, K>[] = [];

  const disposeEff = effect(() => {
    const items = data.get();
    const newRows: ListRow<T, K>[] = [];
    const pool = new Map<K, ListRow<T, K>[]>();

    for (const row of rows) {
      poolRow(pool, row);
    }

    for (let i = 0; i < items.length; i++) {
      const val = items[i]!;
      const key = keyFn(val);
      newRows.push(reuseOrCreateRow(pool, val, i, key, factory));
    }

    // Each row.scope owns every cleanup created by the row's factory
    // invocation, including effects spawned later via effects inside the row.
    // Disposing the scope cascades through Effect.dispose, which tears down
    // its own nested scopes - we do not need to walk recursively here.
    disposePool(pool);

    for (let i = 0; i < newRows.length; i++) {
      const row = newRows[i]!;
      if (node.children[i] !== row.el) {
        node.insertBefore(row.el, node.children[i] ?? null);
      }
    }

    rows = newRows;
  });

  autoDispose(node, () => {
    disposeEff();
    disposeRows(rows);
    rows = [];
  });

  return node;
}

/* ---------- show ---------- */

export function show(
  condition: Sig<boolean> | Derive<boolean> | Condition,
  factory: () => HTMLElement
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.display = "contents";

  let node: HTMLElement | null = null;
  let scope: Disposer[] = [];

  const disposeChild = () => {
    if (node?.parentNode === wrapper) node.remove();
    disposeAll(scope);
    scope = [];
    node = null;
  };

  const ensureChild = () => {
    if (node) return;

    const created = collectScope(factory);
    node = created.value;
    scope = created.scope;
  };

  const disposeEff = effect(() => {
    const visible = resolve(condition instanceof Condition ? () => condition.get() : condition);
    if (!visible) {
      disposeChild();
      return;
    }

    ensureChild();
    if (node!.parentNode === wrapper) return;
    wrapper.appendChild(node!);
  });

  autoDispose(wrapper, () => {
    disposeEff();
    disposeChild();
  });

  return wrapper;
}

/* ---------- keep ----------
 *
 * Sibling of `show` that keeps the node mounted across visibility flips.
 * Built lazily on the first true; on subsequent flips toggles `display`
 * between '' and 'none'. Scope is torn down only when the wrapper itself
 * is disconnected from the document.
 *
 * Use this when the child owns state that's expensive to rebuild - canvas
 * pixel data, scroll position, an open subscription, a paused animation -
 * and the layout is going to hide/show it repeatedly (panel tabs, dock
 * collapse, etc.). For booleans where rebuilding is cheap, prefer `show`.
 *
 * Caveat: the factory must not rely on inline `style.display` for layout;
 * keep owns that property. Use a wrapper div with `display: contents` or
 * a CSS class if the factory needs a specific display mode.
 */
export function keep(
  condition: Sig<boolean> | Derive<boolean> | Condition,
  factory: () => HTMLElement
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.display = "contents";

  let node: HTMLElement | null = null;
  let scope: Disposer[] = [];

  const ensureChild = () => {
    if (node) return;

    const created = collectScope(factory);
    node = created.value;
    scope = created.scope;
    wrapper.appendChild(node);
  };

  const disposeChild = () => {
    if (node?.parentNode === wrapper) node.remove();
    disposeAll(scope);
    scope = [];
    node = null;
  };

  const disposeEff = effect(() => {
    const visible = resolve(condition instanceof Condition ? () => condition.get() : condition);
    if (!visible) {
      if (!node) return;
      node.style.display = "none";
      return;
    }

    ensureChild();
    node!.style.display = "";
  });

  autoDispose(wrapper, () => {
    disposeEff();
    disposeChild();
  });

  return wrapper;
}
