// ============================================================
// vrui - core (signals, derives, effects, batching)
// ============================================================

import { disposeAll, enterScope, exitScope, registerInScope } from "./scope";

/* ---------- globals ---------- */

let activeEffect: Effect | null = null;
let batchDepth = 0;
let notificationDepth = 0;
let effectDepth = 0;
let flushing = false;
const deriveQueue = new Set<Effect>();
const effectQueue = new Set<Effect>();

function throwErrors(errors: unknown[], message: string): void {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, message);
}

function takeFirst(queue: Set<Effect>): Effect {
  const item = queue.values().next().value as Effect;
  queue.delete(item);
  return item;
}

function flushQueue(): void {
  if (flushing || batchDepth || notificationDepth || effectDepth) return;

  const errors: unknown[] = [];
  flushing = true;

  try {
    while (deriveQueue.size || effectQueue.size) {
      const queue = deriveQueue.size ? deriveQueue : effectQueue;
      const next = takeFirst(queue);

      try {
        next.run();
      } catch (err) {
        errors.push(err);
      }
    }
  } finally {
    flushing = false;
  }

  throwErrors(errors, "vrui: multiple reactive updates failed");
}

function enqueue(effect: Effect, derived: boolean): void {
  (derived ? deriveQueue : effectQueue).add(effect);
  flushQueue();
}

function dequeue(effect: Effect): void {
  deriveQueue.delete(effect);
  effectQueue.delete(effect);
}

/* ---------- core types ---------- */

export type Cleanup = (() => void) | void;
export type ReactiveValue<T> = Sig<T> | Derive<T> | (() => T);

export function resolve<T>(v: T | ReactiveValue<T>): T {
  if (v instanceof Sig || v instanceof Derive) return v.get();
  if (typeof v === "function") return (v as () => T)();
  return v;
}

export function isReactive(v: unknown): v is ReactiveValue<unknown> {
  return v instanceof Sig || v instanceof Derive || typeof v === "function";
}

export function untrack<T>(fn: () => T): T {
  const prev = activeEffect;
  activeEffect = null;
  try {
    return fn();
  } finally {
    activeEffect = prev;
  }
}

/* ---------- effect ---------- */

export class Effect {
  private fn: () => Cleanup;
  private cleanup: Cleanup = undefined;
  private deps = new Set<Sig<unknown>>();
  private scopeDisposers: (() => void)[] = [];
  private disposed = false;
  private running = false;
  private derived: boolean;

  constructor(fn: () => Cleanup, trackScope = true, derived = false) {
    this.fn = fn;
    this.derived = derived;
    this.run();
    if (trackScope) registerInScope(() => this.dispose());
  }

  private releaseOwned(scope: (() => void)[], cleanup: Cleanup): void {
    const errors: unknown[] = [];
    const prev = activeEffect;
    activeEffect = null;

    try {
      try {
        disposeAll(scope);
      } catch (err) {
        errors.push(err);
      }

      if (cleanup) {
        try {
          cleanup();
        } catch (err) {
          errors.push(err);
        }
      }
    } finally {
      activeEffect = prev;
    }

    throwErrors(errors, "vrui: multiple effect cleanups failed");
  }

  private drainOwned(): void {
    const scope = this.scopeDisposers;
    const cleanup = this.cleanup;
    this.scopeDisposers = [];
    this.cleanup = undefined;
    this.releaseOwned(scope, cleanup);
  }

  private clearDeps(): void {
    for (const d of this.deps) d.unsub(this);
    this.deps.clear();
  }

  private restoreDeps(oldDeps: Set<Sig<unknown>>): void {
    this.clearDeps();
    for (const d of oldDeps) {
      this.deps.add(d);
      d.sub(this);
    }
  }

  private execute(): void {
    const oldDeps = new Set(this.deps);

    this.running = true;
    try {
      this.clearDeps();

      try {
        this.drainOwned();
      } catch (err) {
        if (!this.disposed) this.restoreDeps(oldDeps);
        throw err;
      }

      if (this.disposed) return;

      const prev = activeEffect;
      activeEffect = this;
      enterScope();

      let cleanup: Cleanup = undefined;
      let scope: (() => void)[] = [];
      const errors: unknown[] = [];

      try {
        cleanup = this.fn();
      } catch (err) {
        errors.push(err);
      } finally {
        try {
          scope = exitScope();
        } catch (err) {
          errors.push(err);
        } finally {
          activeEffect = prev;
        }
      }

      if (errors.length || this.disposed) {
        this.clearDeps();
        if (!this.disposed) this.restoreDeps(oldDeps);

        try {
          this.releaseOwned(scope, errors.length ? undefined : cleanup);
        } catch (err) {
          errors.push(err);
        }

        throwErrors(errors, "vrui: effect execution and cleanup failed");
        return;
      }

      this.cleanup = cleanup;
      this.scopeDisposers = scope;
    } finally {
      this.running = false;
    }
  }

  run(): void {
    if (this.disposed || this.running) return;

    const errors: unknown[] = [];
    effectDepth++;

    try {
      this.execute();
    } catch (err) {
      errors.push(err);
    } finally {
      effectDepth--;
    }

    try {
      flushQueue();
    } catch (err) {
      errors.push(err);
    }

    throwErrors(errors, "vrui: effect and scheduled updates failed");
  }

  addDep(sig: Sig<unknown>): void {
    this.deps.add(sig);
  }

  removeDep(sig: Sig<unknown>): void {
    this.deps.delete(sig);
  }

  notify(): void {
    if (this.disposed || this.running) return;
    enqueue(this, this.derived);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    dequeue(this);
    this.clearDeps();
    this.drainOwned();
  }
}

export function effect(fn: () => Cleanup): () => void {
  const e = new Effect(fn);
  return () => e.dispose();
}

/* ---------- batch ---------- */

export function batch(fn: () => void): void {
  const errors: unknown[] = [];
  batchDepth++;

  try {
    fn();
  } catch (err) {
    errors.push(err);
  } finally {
    batchDepth--;
  }

  try {
    flushQueue();
  } catch (err) {
    errors.push(err);
  }

  throwErrors(errors, "vrui: batch and scheduled updates failed");
}

/* ---------- sig ---------- */

export class Sig<T> {
  protected _val: T;
  private subs = new Set<Effect>();

  constructor(v: T) {
    this._val = v;
  }

  get(): T {
    if (!activeEffect) return this._val;

    this.subs.add(activeEffect);
    activeEffect.addDep(this);
    return this._val;
  }

  protected setRaw(v: T): void {
    if (Object.is(this._val, v)) return;
    this._val = v;
    this.notify();
  }

  set(v: T): void {
    this.setRaw(v);
  }

  update(fn: (v: T) => T): void {
    this.set(fn(this._val));
  }

  sub(e: Effect): void {
    this.subs.add(e);
  }
  unsub(e: Effect): void {
    this.subs.delete(e);
  }

  notify(): void {
    // Snapshot to avoid re-visiting effects that re-subscribe mid-iteration.
    // JS Set iteration revisits entries that are deleted then re-added during
    // the same loop, which Effect.run does (unsubs all deps, then re-reads).
    notificationDepth++;
    try {
      const snapshot = Array.from(this.subs);
      for (const e of snapshot) e.notify();
    } finally {
      notificationDepth--;
    }

    flushQueue();
  }

  dispose(): void {
    for (const e of this.subs) e.removeDep(this);
    this.subs.clear();
  }

  /* ---- transforms ---- */

  map<U>(fn: (v: T) => U): Derive<U> {
    return derive(() => fn(this.get()));
  }

  eq(v: T | ReactiveValue<T>): Condition {
    return new Condition(derive(() => Object.is(this.get(), resolve(v))));
  }

  /* ---- event helpers ---- */

  toggle(this: Sig<boolean>): () => void {
    return () => this.set(!this._val);
  }

  setter(v: T | ReactiveValue<T>): () => void {
    return () => this.set(resolve(v));
  }

  fromInput(): (e: Event) => void {
    return (e) => this.set((e.target as HTMLInputElement).value as unknown as T);
  }

  /* ---- object / array helpers ---- */

  prop<K extends keyof T>(key: K): Derive<T[K]> {
    return derive(() => this.get()[key]);
  }

  or<F>(fallback: F): Derive<NonNullable<T> | F> {
    return derive(() => (this.get() ?? fallback) as NonNullable<T> | F);
  }

  /* -- array only -- */

  index<E>(this: Sig<readonly E[]>, idx: number | Sig<number>): Derive<E | undefined> {
    return derive(() => {
      const i = idx instanceof Sig ? idx.get() : idx;
      return this.get()[i];
    });
  }

  filter<E, Q>(
    this: Sig<readonly E[]>,
    query: Sig<Q>,
    fn: (item: E, query: Q) => boolean,
  ): Derive<E[]> {
    return derive(() => {
      const value = query.get();
      return this.get().filter((item) => fn(item, value));
    });
  }
}

export function sig<T>(v: T): Sig<T> {
  return new Sig(v);
}

/* ---------- derive ---------- */

const NO_DERIVE_ERROR = Symbol("no derive error");

export class Derive<T> extends Sig<T> {
  private _effect: Effect;
  private _error: unknown = NO_DERIVE_ERROR;

  constructor(fn: () => T) {
    super(undefined as T);
    this._effect = new Effect(() => {
      let value: T;
      try {
        value = fn();
      } catch (error) {
        this._error = error;
        this.notify();
        throw error;
      }

      const recovered = this._error !== NO_DERIVE_ERROR;
      this._error = NO_DERIVE_ERROR;
      if (!recovered && Object.is(value, this._val)) return;
      this._val = value;
      this.notify();
    }, false, true);
    registerInScope(() => this.dispose());
  }

  override get(): T {
    const value = super.get();
    if (this._error !== NO_DERIVE_ERROR) throw this._error;
    return value;
  }

  override set(_v: T): never {
    throw new Error("derive is read-only");
  }

  override update(_fn: (v: T) => T): never {
    throw new Error("derive is read-only");
  }

  override toggle(this: Sig<boolean>): never {
    throw new Error("derive is read-only");
  }

  override setter(_v: T | ReactiveValue<T>): never {
    throw new Error("derive is read-only");
  }

  override fromInput(): never {
    throw new Error("derive is read-only");
  }

  override dispose(): void {
    this._effect.dispose();
    super.dispose();
  }
}

export function derive<T>(fn: () => T): Derive<T> {
  return new Derive(fn);
}

/* ---------- condition ---------- */

export class Condition {
  private d: Derive<boolean>;

  constructor(d: Derive<boolean>) {
    this.d = d;
  }

  get(): boolean {
    return this.d.get();
  }

  select(a: string, b: string): Derive<string> {
    return derive(() => (this.d.get() ? a : b));
  }
}
