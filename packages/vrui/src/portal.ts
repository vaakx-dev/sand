// ============================================================
// vrui - portal (mount a subtree into a non-parent DOM node)
// ============================================================

import { appendChild } from "./dom";
import type { Child } from "./domTypes";
import { onDisconnect } from "./lifecycle";
import { collectScope, disposeAll, once, registerInScope } from "./scope";

type PortalFactory = () => Child | Child[];
type PortalChild = Child | PortalFactory;

type MountedPortal = {
  dispose: () => void;
};

function documentObserverRoot(): Node {
  return document.documentElement ?? document.body ?? document;
}

function isFactory(children: PortalChild[]): children is [PortalFactory] {
  return children.length === 1 && typeof children[0] === "function";
}

function appendPortalChildren(
  parent: Node,
  children: PortalChild[],
  disposePortal: () => void,
): MountedPortal {
  const frag = document.createDocumentFragment();
  const created = collectScope(() => {
    if (isFactory(children)) {
      appendChild(frag, children[0]());
      return;
    }

    for (const child of children) appendChild(frag, child as Child);
  });

  const mounted = Array.from(frag.childNodes);
  parent.appendChild(frag);

  let cancelDisconnects: (() => void)[] = [];
  const dispose = once(() => {
    for (const cancel of cancelDisconnects) cancel();
    cancelDisconnects = [];

    for (const node of mounted) {
      if (node.parentNode === parent) node.parentNode.removeChild(node);
    }
    disposeAll(created.scope);
  });

  cancelDisconnects = [
    ...mounted.map((node) => onDisconnect(node, disposePortal)),
    onDisconnect(parent, disposePortal),
  ];

  return { dispose };
}

function mountWhenAvailable(
  targetId: string,
  children: PortalChild[],
  disposePortal: () => void,
): () => void {
  let mounted: MountedPortal | undefined;
  let disposed = false;
  let observer: MutationObserver | undefined;

  function tryMount(): void {
    if (disposed || mounted) return;

    const parent = document.getElementById(targetId);
    if (!parent) return;

    observer?.disconnect();
    observer = undefined;
    mounted = appendPortalChildren(parent, children, disposePortal);
  }

  observer = new MutationObserver(tryMount);
  observer.observe(documentObserverRoot(), { childList: true, subtree: true });
  queueMicrotask(tryMount);

  const dispose = once(() => {
    disposed = true;
    observer?.disconnect();
    mounted?.dispose();
  });

  return dispose;
}

export function portal(target: Node | string, ...children: PortalChild[]): Comment {
  const marker = document.createComment("vrui portal");
  let disposeTarget = () => {};
  let cancelMarkerDisconnect = () => {};
  const dispose = once(() => {
    cancelMarkerDisconnect();
    disposeTarget();
  });

  if (typeof target === "string") {
    const parent = document.getElementById(target);
    disposeTarget = parent
      ? appendPortalChildren(parent, children, dispose).dispose
      : mountWhenAvailable(target, children, dispose);
  } else {
    disposeTarget = appendPortalChildren(target, children, dispose).dispose;
  }

  cancelMarkerDisconnect = onDisconnect(marker, dispose);
  registerInScope(dispose);

  return marker;
}
