// ============================================================
// vrui - cleanup-aware browser helpers
// ============================================================

import { autoDispose, listen, onWindow } from "./lifecycle";
import { once, scoped } from "./scope";

export function onTimeout(fn: () => void, ms?: number): () => void {
  const id = window.setTimeout(fn, ms);

  return scoped(once(() => window.clearTimeout(id)));
}

export function onInterval(fn: () => void, ms?: number): () => void {
  const id = window.setInterval(fn, ms);

  return scoped(once(() => window.clearInterval(id)));
}

export function onRaf(fn: FrameRequestCallback): () => void {
  const id = window.requestAnimationFrame(fn);

  return scoped(once(() => window.cancelAnimationFrame(id)));
}

export function onResize(
  owner: Node,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions,
): () => void {
  return onWindow(owner, "resize", handler, options);
}

export type MediaHandler = (matches: boolean, media: MediaQueryList) => void;

export function onMedia(query: string | MediaQueryList, fn: MediaHandler): () => void {
  const media = typeof query === "string" ? window.matchMedia(query) : query;
  const handler = () => fn(media.matches, media);

  handler();

  return listen(media, "change", handler);
}

export function resizeObserver(
  owner: Element,
  fn: ResizeObserverCallback,
  options?: ResizeObserverOptions,
): ResizeObserver {
  const observer = new ResizeObserver(fn);
  observer.observe(owner, options);
  autoDispose(owner, () => observer.disconnect());
  return observer;
}

export function intersectionObserver(
  owner: Element,
  fn: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): IntersectionObserver {
  const observer = new IntersectionObserver(fn, options);
  observer.observe(owner);
  autoDispose(owner, () => observer.disconnect());
  return observer;
}
