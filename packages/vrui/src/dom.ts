// ============================================================
// vrui - dom factories + reactive prop/child bindings
// ============================================================

import {
  effect,
  isReactive,
  resolve,
  type Cleanup,
} from "./core";
import type {
  Child,
  ClassValue,
  Props,
  StyleValue,
  WritableSignal,
} from "./domTypes";
import { eventNameFromProp } from "./events";
import {
  autoDispose,
  onMount,
  onTarget,
} from "./lifecycle";
import { setStyle } from "./style";
import { ensureUtilities } from "./utilities/registry";

/* ---------- string + class helpers ---------- */

export function safeStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function isNode(v: unknown): v is Node {
  return typeof Node !== "undefined" && v instanceof Node;
}

export function classStr(v: ClassValue): string {
  if (Array.isArray(v)) return v.map(classStr).filter(Boolean).join(" ");
  if (v == null || v === false) return "";
  if (typeof v === "object" && !isNode(v)) {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, enabled]) => !!resolve(enabled))
      .map(([name]) => name)
      .join(" ");
  }
  return String(resolve(v));
}

function hasReactivePart(value: unknown): boolean {
  if (isReactive(value)) return true;
  if (Array.isArray(value)) return value.some(hasReactivePart);
  if (value && typeof value === "object" && !isNode(value)) {
    return Object.values(value as Record<string, unknown>).some(hasReactivePart);
  }
  return false;
}

function setClass(el: HTMLElement, value: unknown): void {
  if (hasReactivePart(value)) {
    const dispose = effect(() => {
      const next = classStr(resolve(value) as ClassValue);
      el.className = ensureUtilities(el, next);
    });
    autoDispose(el, dispose);
    return;
  }
  const next = classStr(value as ClassValue);
  el.className = ensureUtilities(el, next);
}

function isWritableSignal(value: unknown): value is WritableSignal<unknown> {
  return !!value &&
    typeof value === "object" &&
    typeof (value as WritableSignal<unknown>).get === "function" &&
    typeof (value as WritableSignal<unknown>).set === "function";
}

function isValueElement(
  el: HTMLElement,
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement;
}

function bindValue(el: HTMLElement, value: unknown): void {
  if (!isWritableSignal(value)) {
    throw new Error("vrui: bindValue expects a writable signal");
  }
  if (!isValueElement(el)) {
    throw new Error("vrui: bindValue can only be used on input, textarea, or select");
  }

  const dispose = effect(() => {
    const next = safeStr(value.get());
    if (el.value !== next) el.value = next;
  });
  autoDispose(el, dispose);

  const event = el instanceof HTMLSelectElement ? "change" : "input";
  const handler = () => value.set(el.value);
  onTarget(el, el, event, handler);
}

function bindChecked(el: HTMLElement, value: unknown): void {
  if (!isWritableSignal(value)) {
    throw new Error("vrui: bindChecked expects a writable boolean signal");
  }
  if (!(el instanceof HTMLInputElement)) {
    throw new Error("vrui: bindChecked can only be used on input");
  }

  const dispose = effect(() => {
    const next = !!value.get();
    if (el.checked !== next) el.checked = next;
  });
  autoDispose(el, dispose);

  const handler = () => value.set(el.checked);
  onTarget(el, el, "change", handler);
}

type DomPropSetter = (el: HTMLElement, value: unknown) => void;

function setText(el: HTMLElement, value: unknown): void {
  if (!isReactive(value)) {
    el.textContent = safeStr(value);
    return;
  }

  const dispose = effect(() => {
    el.textContent = safeStr(resolve(value));
  });
  autoDispose(el, dispose);
}

function setEventProp(el: HTMLElement, key: string, value: unknown): void {
  const event = eventNameFromProp(key);
  const handler = value as EventListener;
  onTarget(el, el, event, handler);
}

function isEventProp(key: string): boolean {
  return key.length > 2 && key.startsWith("on") && /[A-Z]/.test(key[2]!);
}

function isAttributeProp(key: string): boolean {
  return key.startsWith("data-") || key.startsWith("aria-") || key === "role";
}

function writeAttribute(el: HTMLElement, key: string, value: unknown): void {
  if (value == null) {
    el.removeAttribute(key);
    return;
  }

  el.setAttribute(key, String(value));
}

function setAttributeProp(el: HTMLElement, key: string, value: unknown): void {
  if (!isReactive(value)) {
    writeAttribute(el, key, value);
    return;
  }

  const dispose = effect(() => writeAttribute(el, key, resolve(value)));
  autoDispose(el, dispose);
}

function setInputValueProp(el: HTMLInputElement, value: unknown): void {
  if (!isReactive(value)) {
    el.value = safeStr(value);
    return;
  }

  const dispose = effect(() => {
    const next = safeStr(resolve(value));
    if (el.value !== next) el.value = next;
  });
  autoDispose(el, dispose);
}

function maybeSetInputValueProp(el: HTMLElement, key: string, value: unknown): boolean {
  if (key !== "value" || !(el instanceof HTMLInputElement)) return false;
  setInputValueProp(el, value);
  return true;
}

function setDomProperty(el: HTMLElement, key: string, value: unknown): void {
  if (!isReactive(value)) {
    Reflect.set(el, key, value);
    return;
  }

  const dispose = effect(() => {
    Reflect.set(el, key, resolve(value));
  });
  autoDispose(el, dispose);
}

const DOM_PROP_SETTERS: Record<string, DomPropSetter> = {
  ref: (el, value) => (value as (el: HTMLElement) => void)(el),
  onMount: (el, value) => onMount(el, value as (el: Node) => Cleanup),
  bindValue,
  bindChecked,
  class: setClass,
  style: (el, value) => setStyle(el, value as StyleValue),
  text: setText,
};

function setProp(el: HTMLElement, key: string, value: unknown): void {
  const setter = DOM_PROP_SETTERS[key];
  if (setter) {
    setter(el, value);
    return;
  }

  if (isEventProp(key)) {
    setEventProp(el, key, value);
    return;
  }

  if (isAttributeProp(key)) {
    setAttributeProp(el, key, value);
    return;
  }

  if (maybeSetInputValueProp(el, key, value)) return;
  setDomProperty(el, key, value);
}

export function appendChild(parent: Node, child: Child): void {
  if (child == null || child === false || child === true) return;

  if (Array.isArray(child)) {
    for (const c of child) appendChild(parent, c);
    return;
  }

  if (isNode(child)) {
    parent.appendChild(child);
    return;
  }

  if (isReactive(child)) {
    const text = document.createTextNode("");
    const dispose = effect(() => {
      text.textContent = safeStr(resolve(child));
    });
    autoDispose(text, dispose);
    parent.appendChild(text);
    return;
  }

  parent.appendChild(document.createTextNode(safeStr(child)));
}

function isChildArgument(value: unknown): value is Child {
  return value != null &&
    (typeof value !== "object" ||
      isNode(value) ||
      Array.isArray(value) ||
      isReactive(value));
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props<HTMLElementTagNameMap[K]> | Child,
  ...children: Child[]
): HTMLElementTagNameMap[K];
export function el(tag: string, props?: Props | Child, ...children: Child[]): HTMLElement;
export function el(tag: string, props?: unknown, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag);

  if (isChildArgument(props)) {
    children.unshift(props);
    props = undefined;
  }

  const deferredProps: [string, unknown][] = [];
  if (props) {
    for (const [key, value] of Object.entries(props as Props)) {
      if (key === "bindValue" || key === "bindChecked") {
        deferredProps.push([key, value]);
        continue;
      }

      setProp(node, key, value);
    }
  }

  for (const child of children) {
    appendChild(node, child);
  }

  for (const [key, value] of deferredProps) {
    setProp(node, key, value);
  }

  return node;
}
