import { compileUtility, type CompiledUtility } from "./compiler";

type Registry = {
  rules: Map<string, CompiledUtility>;
  style: HTMLStyleElement;
};

const registries = new WeakMap<Document, Registry>();

function createStyle(document: Document): HTMLStyleElement {
  const style = document.createElement("style");
  style.setAttribute("data-vrui-utilities", "");
  (document.head ?? document.documentElement).appendChild(style);
  return style;
}

function registry(document: Document): Registry {
  let current = registries.get(document);
  if (!current) {
    current = { rules: new Map(), style: createStyle(document) };
    registries.set(document, current);
    return current;
  }

  if (!current.style.isConnected) {
    current.style = createStyle(document);
    render(current);
  }
  return current;
}

function render(current: Registry): void {
  current.style.textContent = Array.from(current.rules.values())
    .sort((left, right) => left.order.localeCompare(right.order))
    .map((rule) => rule.css)
    .join("\n");
}

export function ensureUtilities(element: Element, className: string): string {
  const tokens = className.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.includes("[") || token.includes("]")) {
      throw new Error(`vrui: arbitrary utility values are not supported: ${token}`);
    }
  }

  const compiled = tokens
    .map(compileUtility)
    .filter((rule): rule is CompiledUtility => !!rule);
  if (!compiled.length) return className;

  const current = registry(element.ownerDocument);
  let changed = false;
  for (const rule of compiled) {
    if (current.rules.has(rule.token)) continue;
    current.rules.set(rule.token, rule);
    changed = true;
  }
  if (changed) render(current);
  return className;
}
