// ============================================================
// vrui - svg factories with reactive props (mirrors dom.ts shape)
// ============================================================
//
// SVG needs its own namespace and attribute-oriented prop path. Using the HTML
// factory would create nodes that look correct structurally but do not render.

import { effect, isReactive, resolve } from "./core";
import {
  appendChild,
  classStr,
  safeStr,
} from "./dom";
import type { Child, ClassValue, StyleValue } from "./domTypes";
import { eventNameFromProp } from "./events";
import { autoDispose, onMount, onTarget } from "./lifecycle";
import { setStyle } from "./style";
import type { SvgProps } from "./svgTypes";

const SVG_NS = "http://www.w3.org/2000/svg";

const SVG_ATTR_ALIASES: Record<string, string> = {
  alignmentBaseline: "alignment-baseline",
  baselineShift: "baseline-shift",
  className: "class",
  clipPath: "clip-path",
  clipRule: "clip-rule",
  colorInterpolation: "color-interpolation",
  colorInterpolationFilters: "color-interpolation-filters",
  colorRendering: "color-rendering",
  dominantBaseline: "dominant-baseline",
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  floodColor: "flood-color",
  floodOpacity: "flood-opacity",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontSizeAdjust: "font-size-adjust",
  fontStretch: "font-stretch",
  fontStyle: "font-style",
  fontVariant: "font-variant",
  fontWeight: "font-weight",
  imageRendering: "image-rendering",
  letterSpacing: "letter-spacing",
  lightingColor: "lighting-color",
  markerEnd: "marker-end",
  markerMid: "marker-mid",
  markerStart: "marker-start",
  shapeRendering: "shape-rendering",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeMiterlimit: "stroke-miterlimit",
  strokeOpacity: "stroke-opacity",
  strokeWidth: "stroke-width",
  textAnchor: "text-anchor",
  textDecoration: "text-decoration",
  textRendering: "text-rendering",
  transformOrigin: "transform-origin",
  vectorEffect: "vector-effect",
  wordSpacing: "word-spacing",
  writingMode: "writing-mode",
};

function isNode(v: unknown): v is Node {
  return typeof Node !== "undefined" && v instanceof Node;
}

function hasReactivePart(value: unknown): boolean {
  if (isReactive(value)) return true;
  if (Array.isArray(value)) return value.some(hasReactivePart);
  if (value && typeof value === "object" && !isNode(value)) {
    return Object.values(value as Record<string, unknown>).some(hasReactivePart);
  }
  return false;
}

function svgAttrName(key: string): string {
  return SVG_ATTR_ALIASES[key] ?? key;
}

function writeSvgAttr(el: SVGElement, key: string, value: unknown): void {
  if (value == null) {
    el.removeAttribute(key);
    return;
  }

  el.setAttribute(key, String(value));
}

type SvgPropSetter = (el: SVGElement, value: unknown) => void;

function setSvgClass(el: SVGElement, value: unknown): void {
  if (!hasReactivePart(value)) {
    el.setAttribute("class", classStr(value as ClassValue));
    return;
  }

  const dispose = effect(() => {
    const next = isReactive(value) ? resolve(value) : value;
    el.setAttribute("class", classStr(next as ClassValue));
  });
  autoDispose(el, dispose);
}

function setSvgText(el: SVGElement, value: unknown): void {
  if (!isReactive(value)) {
    el.textContent = safeStr(value);
    return;
  }

  const dispose = effect(() => {
    el.textContent = safeStr(resolve(value));
  });
  autoDispose(el, dispose);
}

function setSvgEvent(el: SVGElement, key: string, value: unknown): void {
  const event = eventNameFromProp(key);
  const handler = value as EventListener;
  onTarget(el, el, event, handler);
}

function isEventProp(key: string): boolean {
  return key.length > 2 && key.startsWith("on") && /[A-Z]/.test(key[2]!);
}

function setSvgAttr(el: SVGElement, key: string, value: unknown): void {
  if (!isReactive(value)) {
    writeSvgAttr(el, key, value);
    return;
  }

  const dispose = effect(() => writeSvgAttr(el, key, resolve(value)));
  autoDispose(el, dispose);
}

const SVG_PROP_SETTERS: Record<string, SvgPropSetter> = {
  ref: (el, value) => (value as (el: SVGElement) => void)(el),
  onMount: (el, value) => onMount(el, value as (el: Node) => void | (() => void)),
  style: (el, value) => setStyle(el, value as StyleValue),
  text: setSvgText,
};

function setSvgProp(el: SVGElement, key: string, value: unknown): void {
  const attr = svgAttrName(key);

  if (attr === "class") {
    setSvgClass(el, value);
    return;
  }

  const setter = SVG_PROP_SETTERS[key];
  if (setter) {
    setter(el, value);
    return;
  }

  if (isEventProp(key)) {
    setSvgEvent(el, key, value);
    return;
  }

  // Everything else (including data-*, aria-*, role, geometry attributes
  // like x/y/cx/cy/width/r/d/transform, presentation attrs like fill/stroke)
  // goes through setAttribute. SVG elements expose most of these as DOM
  // properties too, but the property model is inconsistent across browsers
  // and engines; setAttribute is the safe path.
  setSvgAttr(el, attr, value);
}

function isChildArgument(value: unknown): value is Child {
  return value != null &&
    (typeof value !== "object" ||
      isNode(value) ||
      Array.isArray(value) ||
      isReactive(value));
}

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  props?: SvgProps<SVGElementTagNameMap[K]> | Child,
  ...children: Child[]
): SVGElementTagNameMap[K];
export function svgEl(tag: string, props?: SvgProps | Child, ...children: Child[]): SVGElement;
export function svgEl(tag: string, props?: unknown, ...children: Child[]): SVGElement {
  const node = document.createElementNS(SVG_NS, tag);

  // Mirror dom.ts: allow callers to omit props and pass children directly.
  if (isChildArgument(props)) {
    children.unshift(props);
    props = undefined;
  }

  if (props) {
    for (const [key, value] of Object.entries(props as SvgProps)) {
      setSvgProp(node, key, value);
    }
  }

  for (const child of children) {
    appendChild(node, child);
  }

  return node;
}

/* tag shortcuts. We rename anything that collides with HTML factory names
 * in dom.ts (a, title) or with JS reserved words (use) to keep imports
 * unambiguous at call sites. */
export const svg = (props?: SvgProps<SVGSVGElement> | Child, ...children: Child[]) => svgEl("svg", props, ...children);
export const g = (props?: SvgProps<SVGGElement> | Child, ...children: Child[]) => svgEl("g", props, ...children);
export const path = (props?: SvgProps<SVGPathElement> | Child, ...children: Child[]) => svgEl("path", props, ...children);
export const rect = (props?: SvgProps<SVGRectElement> | Child, ...children: Child[]) => svgEl("rect", props, ...children);
export const circle = (props?: SvgProps<SVGCircleElement> | Child, ...children: Child[]) => svgEl("circle", props, ...children);
export const ellipse = (props?: SvgProps<SVGEllipseElement> | Child, ...children: Child[]) => svgEl("ellipse", props, ...children);
export const line = (props?: SvgProps<SVGLineElement> | Child, ...children: Child[]) => svgEl("line", props, ...children);
export const polyline = (props?: SvgProps<SVGPolylineElement> | Child, ...children: Child[]) => svgEl("polyline", props, ...children);
export const polygon = (props?: SvgProps<SVGPolygonElement> | Child, ...children: Child[]) => svgEl("polygon", props, ...children);
export const defs = (props?: SvgProps<SVGDefsElement> | Child, ...children: Child[]) => svgEl("defs", props, ...children);
export const textEl = (props?: SvgProps<SVGTextElement> | Child, ...children: Child[]) => svgEl("text", props, ...children);
export const titleEl = (props?: SvgProps<SVGTitleElement> | Child, ...children: Child[]) => svgEl("title", props, ...children);
export const useEl = (props?: SvgProps<SVGUseElement> | Child, ...children: Child[]) => svgEl("use", props, ...children);
