// ============================================================
// vrui - DOM lifecycle ownership + cleanup-aware listeners
// ============================================================

import type { Cleanup } from "./core";
import { hasScope, once, scoped } from "./scope";

type DisconnectRegistration = {
  callback: () => void;
  release: () => void;
};

type MountRegistration = {
  callback: (node: Node) => Cleanup;
  cleanup?: () => void;
  release: () => void;
};

type LifecycleState = {
  connected: boolean;
  disconnects: Set<DisconnectRegistration>;
  mounts: Set<MountRegistration>;
};

const lifecycles = new WeakMap<Node, LifecycleState>();
let observer: MutationObserver | undefined;

function isConnected(node: Node): boolean {
  return node.isConnected;
}

function stateFor(node: Node): LifecycleState {
  const existing = lifecycles.get(node);
  if (existing) return existing;

  const state: LifecycleState = {
    connected: isConnected(node),
    disconnects: new Set(),
    mounts: new Set(),
  };
  lifecycles.set(node, state);
  return state;
}

function prune(node: Node, state: LifecycleState): void {
  if (state.disconnects.size || state.mounts.size) return;
  if (lifecycles.get(node) === state) lifecycles.delete(node);
}

function collectRegistered(root: Node, found: Set<Node>): void {
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    if (lifecycles.has(node)) found.add(node);

    for (let child = node.firstChild; child; child = child.nextSibling) {
      pending.push(child);
    }
  }
}

function runMount(
  node: Node,
  state: LifecycleState,
  registration: MountRegistration,
): void {
  if (!state.mounts.has(registration)) return;

  let cleanup: Cleanup;
  try {
    cleanup = registration.callback(node);
  } catch (error) {
    state.mounts.delete(registration);
    registration.release();
    prune(node, state);
    throw error;
  }

  if (typeof cleanup === "function") {
    registration.cleanup = once(cleanup);
    return;
  }

  state.mounts.delete(registration);
  registration.release();
  prune(node, state);
}

function connect(node: Node, state: LifecycleState): void {
  state.connected = true;

  const errors: unknown[] = [];
  for (const registration of [...state.mounts]) {
    try {
      runMount(node, state, registration);
    } catch (error) {
      errors.push(error);
    }
  }

  throwErrors(errors);
}

function disconnect(node: Node, state: LifecycleState): void {
  lifecycles.delete(node);
  state.connected = false;

  const callbacks: (() => void)[] = [];
  for (const registration of state.disconnects) {
    registration.release();
    callbacks.push(registration.callback);
  }
  state.disconnects.clear();

  for (const registration of state.mounts) {
    registration.release();
    if (registration.cleanup) callbacks.push(registration.cleanup);
  }
  state.mounts.clear();

  const errors: unknown[] = [];
  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      errors.push(error);
    }
  }

  throwErrors(errors);
}

function throwErrors(errors: unknown[]): void {
  if (errors.length === 0) return;
  if (errors.length === 1) throw errors[0];
  throw new AggregateError(errors, "vrui: multiple lifecycle callbacks failed");
}

function flush(mutations: MutationRecord[]): void {
  const added = new Set<Node>();
  const affected = new Set<Node>();

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      collectRegistered(node, added);
      collectRegistered(node, affected);
    }
    for (const node of mutation.removedNodes) {
      collectRegistered(node, affected);
    }
  }

  const errors: unknown[] = [];
  for (const node of affected) {
    const state = lifecycles.get(node);
    if (!state) continue;

    if (isConnected(node)) {
      if (!state.connected) {
        try {
          connect(node, state);
        } catch (error) {
          errors.push(error);
        }
      }
      continue;
    }

    if (!state.connected && !added.has(node)) continue;

    try {
      disconnect(node, state);
    } catch (error) {
      errors.push(error);
    }
  }

  throwErrors(errors);
}

function ensureObserver(): void {
  if (observer || typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return;
  }

  observer = new MutationObserver(flush);
  observer.observe(document, { childList: true, subtree: true });
}

/**
 * Run a callback once the node has been connected and is later disconnected.
 * The returned function cancels the pending registration without running it.
 */
export function onDisconnect(node: Node, callback: () => void): () => void {
  ensureObserver();
  const state = stateFor(node);

  let trackedNode: Node | undefined = node;
  let trackedState: LifecycleState | undefined = state;
  let trackedRegistration: DisconnectRegistration | undefined;

  const release = () => {
    trackedNode = undefined;
    trackedState = undefined;
    trackedRegistration = undefined;
  };

  const registration: DisconnectRegistration = { callback, release };
  trackedRegistration = registration;
  state.disconnects.add(registration);

  const cancel = once(() => {
    const currentNode = trackedNode;
    const currentState = trackedState;
    const currentRegistration = trackedRegistration;
    release();
    if (!currentNode || !currentState || !currentRegistration) return;

    currentState.disconnects.delete(currentRegistration);
    prune(currentNode, currentState);
  });

  return scoped(cancel);
}

/**
 * Run a callback once the node is connected. A returned cleanup runs when the
 * node disconnects or when the returned disposer is called.
 */
export function onMount(node: Node, callback: (node: Node) => Cleanup): () => void {
  ensureObserver();
  const state = stateFor(node);

  let trackedNode: Node | undefined = node;
  let trackedState: LifecycleState | undefined = state;
  let trackedRegistration: MountRegistration | undefined;

  const release = () => {
    trackedNode = undefined;
    trackedState = undefined;
    trackedRegistration = undefined;
  };

  const registration: MountRegistration = { callback, release };
  trackedRegistration = registration;
  state.mounts.add(registration);

  const dispose = once(() => {
    const currentNode = trackedNode;
    const currentState = trackedState;
    const currentRegistration = trackedRegistration;
    release();
    if (!currentNode || !currentState || !currentRegistration) return;

    currentState.mounts.delete(currentRegistration);
    prune(currentNode, currentState);
    currentRegistration.cleanup?.();
  });

  if (isConnected(node)) {
    if (state.connected) {
      runMount(node, state, registration);
    } else {
      connect(node, state);
    }
  }

  return scoped(dispose);
}

/** Tie cleanup to the active scope, or to the node's mounted lifetime. */
export function autoDispose(node: Node, cleanup: () => void): () => void {
  const runCleanup = once(cleanup);
  if (hasScope()) return scoped(runCleanup);

  const cancelDisconnect = onDisconnect(node, runCleanup);
  return once(() => {
    cancelDisconnect();
    runCleanup();
  });
}

export function listen(
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  target.addEventListener(event, handler, options);
  return scoped(once(() => target.removeEventListener(event, handler, options)));
}

export function onTarget(
  owner: Node,
  target: EventTarget,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  const stop = listen(target, event, handler, options);
  const cancelDisconnect = onDisconnect(owner, stop);

  return once(() => {
    cancelDisconnect();
    stop();
  });
}

export function onWindow(
  owner: Node,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  return onTarget(owner, window, event, handler, options);
}

export function onDocument(
  owner: Node,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  return onTarget(owner, document, event, handler, options);
}
