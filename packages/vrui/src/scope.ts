// ============================================================
// vrui - scope
// ============================================================

export type Disposer = () => void;

export type ScopedValue<T> = {
  value: T;
  scope: Disposer[];
};

const scopeStack: Disposer[][] = [];

export function enterScope(): void {
  scopeStack.push([]);
}

export function exitScope(): Disposer[] {
  const scope = scopeStack.pop();
  if (!scope) throw new Error("vrui: exitScope called without matching enterScope");
  return scope;
}

export function registerInScope(dispose: Disposer): void {
  if (scopeStack.length) scopeStack[scopeStack.length - 1]!.push(dispose);
}

export function hasScope(): boolean {
  return scopeStack.length > 0;
}

export function disposeAll(disposers: Iterable<Disposer>): void {
  const errors: unknown[] = [];

  for (const dispose of disposers) {
    try {
      dispose();
    } catch (err) {
      errors.push(err);
    }
  }

  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(errors, "vrui: multiple disposers failed");
  }
}

export function collectScope<T>(fn: () => T): ScopedValue<T> {
  enterScope();
  try {
    const value = fn();
    return { value, scope: exitScope() };
  } catch (err) {
    const errors = [err];

    try {
      disposeAll(exitScope());
    } catch (disposeErr) {
      errors.push(disposeErr);
    }

    if (errors.length === 1) throw err;
    throw new AggregateError(errors, "vrui: scope creation and cleanup failed");
  }
}

export function once(dispose: Disposer): Disposer {
  let disposed = false;

  return () => {
    if (disposed) return;
    disposed = true;
    dispose();
  };
}

export function scoped(dispose: Disposer): Disposer {
  if (hasScope()) registerInScope(dispose);
  return dispose;
}
