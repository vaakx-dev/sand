import { effect, isReactive, resolve, type ReactiveValue } from "./core";
import type {
  StyleMap,
  StyleShape,
  StyleValue,
} from "./domTypes";
import { autoDispose } from "./lifecycle";

const UNITLESS = new Set([
  "animation-iteration-count", "aspect-ratio", "border-image-outset",
  "border-image-slice", "border-image-width", "box-flex", "box-flex-group",
  "box-ordinal-group", "column-count", "columns", "flex", "flex-grow",
  "flex-positive", "flex-shrink", "flex-negative", "flex-order", "grid-area",
  "grid-row", "grid-row-end", "grid-row-span", "grid-row-start", "grid-column",
  "grid-column-end", "grid-column-span", "grid-column-start", "font-weight",
  "line-clamp", "line-height", "opacity", "order", "orphans", "scale",
  "tab-size", "widows", "z-index", "zoom",
  "fill-opacity", "flood-opacity", "stop-opacity", "stroke-dasharray",
  "stroke-dashoffset", "stroke-miterlimit", "stroke-opacity", "stroke-width",
]);

function toKebab(key: string): string {
  if (key.startsWith("--")) return key;
  return key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function formatValue(key: string, value: unknown): string {
  if (value == null || value === false) return "";
  if (typeof value === "number" && !UNITLESS.has(key) && !key.startsWith("--")) {
    return `${value}px`;
  }
  return String(value);
}

function writeKey(el: HTMLElement | SVGElement, key: string, value: unknown): void {
  const normalized = toKebab(key);
  const formatted = formatValue(normalized, value);
  if (!formatted) {
    el.style.removeProperty(normalized);
    return;
  }

  el.style.setProperty(normalized, formatted);
}

function applyObject(
  el: HTMLElement | SVGElement,
  next: StyleMap,
  previous: Set<string> | null,
): Set<string> {
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(next)) {
    const normalized = toKebab(key);
    seen.add(normalized);
    writeKey(el, key, value);
  }

  if (previous) {
    for (const key of previous) {
      if (!seen.has(key)) el.style.removeProperty(key);
    }
  }

  return seen;
}

function clearKeys(el: HTMLElement | SVGElement, keys: Set<string> | null): void {
  if (!keys) return;
  for (const key of keys) el.style.removeProperty(key);
}

function setEntry(el: HTMLElement | SVGElement, key: string, value: unknown): void {
  if (!isReactive(value)) {
    writeKey(el, key, value);
    return;
  }

  autoDispose(el, effect(() => writeKey(el, key, resolve(value))));
}

function setObject(el: HTMLElement | SVGElement, value: StyleMap): void {
  for (const [key, entry] of Object.entries(value)) setEntry(el, key, entry);
}

function bindReactive(
  el: HTMLElement | SVGElement,
  value: ReactiveValue<StyleShape>,
): void {
  let previous: Set<string> | null = null;
  let usedCssText = false;

  autoDispose(el, effect(() => {
    const next = resolve(value);
    if (next == null) {
      if (usedCssText) el.style.cssText = "";
      else clearKeys(el, previous);
      previous = null;
      usedCssText = false;
      return;
    }

    if (typeof next === "string") {
      el.style.cssText = next;
      previous = null;
      usedCssText = true;
      return;
    }

    if (usedCssText) el.style.cssText = "";
    previous = applyObject(el, next, previous);
    usedCssText = false;
  }));
}

export function setStyle(el: HTMLElement | SVGElement, value: StyleValue): void {
  if (value == null) return;

  if (typeof value === "string") {
    el.style.cssText = value;
    return;
  }

  if (isReactive(value)) {
    bindReactive(el, value as ReactiveValue<StyleShape>);
    return;
  }

  setObject(el, value);
}
