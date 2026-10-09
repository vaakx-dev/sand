// ============================================================
// vrui - store + resource (object sugar, async fetch w/ abort)
// ============================================================

import { sig, Sig } from "./core";
import { registerInScope } from "./scope";

/* ---------- store ---------- */

export type Store<T extends object> = { readonly [K in keyof T]: Sig<T[K]> };

export function store<T extends object>(initial: T): Store<T> {
  const prototype = Object.getPrototypeOf(initial);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("vrui: store expects a plain object");
  }

  const result = {} as Store<T>;

  for (const key of Reflect.ownKeys(initial)) {
    const descriptor = Object.getOwnPropertyDescriptor(initial, key);
    if (!descriptor) continue;

    Object.defineProperty(result, key, {
      value: sig(Reflect.get(initial, key)),
      enumerable: descriptor.enumerable,
      configurable: false,
      writable: false,
    });
  }

  return Object.freeze(result);
}

/* ---------- resource ---------- */

export type Resource<T> = {
  data: Sig<T | undefined>;
  loading: Sig<boolean>;
  error: Sig<unknown>;
  refetch: () => void;
  dispose: () => void;
};

export function resource<T>(
  fetcher: (signal?: AbortSignal) => Promise<T> | T,
  options?: { lazy?: boolean }
): Resource<T> {
  const data = sig<T | undefined>(undefined);
  const loading = sig(false);
  const error = sig<unknown>(undefined);
  let controller: AbortController | null = null;
  let token = 0;
  let disposed = false;

  const isCurrent = (request: number): boolean => request === token && !disposed;

  const abortCurrent = () => {
    if (!controller) return;
    controller.abort();
    controller = null;
  };

  const finishRequest = (request: number, current: AbortController) => {
    if (controller === current) controller = null;
    if (!isCurrent(request)) return;
    loading.set(false);
  };

  const failSync = (request: number, current: AbortController, thrown: unknown) => {
    if (controller === current) controller = null;
    if (!isCurrent(request)) return;

    error.set(thrown);
    loading.set(false);
  };

  function load() {
    if (disposed) return;
    abortCurrent();
    const current = new AbortController();
    controller = current;
    const my = ++token;
    data.set(undefined);
    error.set(undefined);
    loading.set(true);

    let promise: Promise<T>;
    try {
      promise = Promise.resolve(fetcher(current.signal));
    } catch (e) {
      failSync(my, current, e);
      return;
    }

    promise
      .then((v) => {
        if (!isCurrent(my)) return;
        data.set(v);
      })
      .catch((e) => {
        if (!isCurrent(my)) return;
        error.set(e);
      })
      .finally(() => finishRequest(my, current));
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    token++;
    abortCurrent();
    data.dispose();
    loading.dispose();
    error.dispose();
  }

  if (!options?.lazy) load();
  registerInScope(dispose);
  return { data, loading, error, refetch: load, dispose };
}
