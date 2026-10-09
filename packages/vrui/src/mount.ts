import { appendChild } from "./dom";
import type { Child } from "./domTypes";
import { collectScope, disposeAll, once, scoped } from "./scope";
import {
  applyTheme,
  type ColorMode,
  type ColorTheme,
} from "./utilities/theme";

export type MountOptions = {
  mode?: ColorMode;
  theme?: ColorTheme;
};

export function byId<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`vrui: missing element #${id}`);
  return el as unknown as T;
}

function mountChildren(
  parent: Node,
  children: Child[],
  options?: MountOptions,
): () => void {
  const fragment = document.createDocumentFragment();
  const { scope } = collectScope(() => {
    for (const child of children) appendChild(fragment, child);
  });

  const mounted = Array.from(fragment.childNodes);
  let stopTheme: (() => void) | undefined;
  if (options) {
    if (!(parent instanceof HTMLElement)) {
      throw new Error("vrui: mount theme options require an HTML element target");
    }
    stopTheme = applyTheme(parent, options.theme, options.mode);
  }
  parent.appendChild(fragment);

  const dispose = once(() => {
    for (const node of mounted) {
      if (node.parentNode === parent) parent.removeChild(node);
    }
    try {
      disposeAll(scope);
    } finally {
      stopTheme?.();
    }
  });

  return scoped(dispose);
}

function observerRoot(): Node {
  return document.documentElement ?? document.body ?? document;
}

function mountWhenAvailable(
  targetId: string,
  children: Child[],
  options?: MountOptions,
): () => void {
  let stopMount: (() => void) | undefined;
  let disposed = false;
  let observer: MutationObserver | undefined;

  function tryMount(): void {
    if (disposed || stopMount) return;
    const parent = document.getElementById(targetId);
    if (!parent) return;
    observer?.disconnect();
    observer = undefined;
    stopMount = mountChildren(parent, children, options);
  }

  observer = new MutationObserver(tryMount);
  observer.observe(observerRoot(), { childList: true, subtree: true });
  queueMicrotask(tryMount);

  const dispose = once(() => {
    disposed = true;
    observer?.disconnect();
    stopMount?.();
  });

  return scoped(dispose);
}

function isMountOptions(value: Child | MountOptions): value is MountOptions {
  return !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Node) &&
    ("theme" in value || "mode" in value);
}

export function mount(
  target: Node | string,
  options: MountOptions,
  ...children: Child[]
): () => void;
export function mount(target: Node | string, ...children: Child[]): () => void;
export function mount(
  target: Node | string,
  ...values: (Child | MountOptions)[]
): () => void {
  const first = values[0];
  const options = first !== undefined && isMountOptions(first)
    ? first
    : undefined;
  const children = (options ? values.slice(1) : values) as Child[];

  if (typeof target !== "string") return mountChildren(target, children, options);

  const parent = document.getElementById(target);
  if (parent) return mountChildren(parent, children, options);
  return mountWhenAvailable(target, children, options);
}

const replacements = new WeakMap<Node, () => void>();

export function replace(target: Node | string, ...children: Child[]): () => void {
  const parent = typeof target === "string" ? byId(target) : target;
  replacements.get(parent)?.();

  while (parent.firstChild) parent.removeChild(parent.firstChild);
  const stop = mount(parent, ...children);

  const dispose = once(() => {
    stop();
    if (replacements.get(parent) === dispose) replacements.delete(parent);
  });

  replacements.set(parent, dispose);
  return dispose;
}
