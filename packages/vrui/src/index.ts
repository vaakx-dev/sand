// ============================================================
// vrui - public api
// ============================================================

export {
  Condition,
  Derive,
  Sig,
  batch,
  derive,
  effect,
  sig,
  untrack,
} from "./core";
export type { Cleanup, ReactiveValue } from "./core";

export {
  collectScope,
  disposeAll,
  enterScope,
  exitScope,
  hasScope,
  once,
  registerInScope,
  scoped,
} from "./scope";
export type { Disposer, ScopedValue } from "./scope";

export { resource, store } from "./store";
export type { Resource, Store } from "./store";

export {
  appendChild,
  classStr,
  el,
  safeStr,
} from "./dom";
export {
  Fragment,
  a,
  article,
  aside,
  button,
  canvas,
  dd,
  details,
  div,
  dialog,
  dl,
  dt,
  em,
  fieldset,
  footer,
  form,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  header,
  img,
  input,
  label,
  li,
  legend,
  main,
  nav,
  ol,
  option,
  p,
  section,
  select,
  small,
  span,
  strong,
  summary,
  table,
  tbody,
  td,
  template,
  textarea,
  tfoot,
  th,
  thead,
  tr,
  ul,
} from "./elements";
export {
  autoDispose,
  listen,
  onDisconnect,
  onDocument,
  onMount,
  onTarget,
  onWindow,
} from "./lifecycle";
export { byId, mount, replace } from "./mount";
export type { MountOptions } from "./mount";
export { setStyle } from "./style";
export type {
  Child,
  ClassValue,
  Component,
  MaybeReactive,
  Props,
  StyleEntry,
  StyleMap,
  StylePrimitive,
  StyleShape,
  StyleValue,
  WritableSignal,
} from "./domTypes";

export {
  event,
  keys,
  prevent,
  preventThen,
  stop,
  stopThen,
} from "./events";
export type {
  EventHandler,
  EventOptions,
  KeyHandler,
  KeyMap,
  KeyOptions,
  EventNameFromProp,
  EventPropName,
  EventProps,
} from "./events";

export {
  intersectionObserver,
  onInterval,
  onMedia,
  onRaf,
  onResize,
  onTimeout,
  resizeObserver,
} from "./browser";
export type { MediaHandler } from "./browser";

export { dynamicChild, keep, list, show } from "./flow";

export { portal } from "./portal";

export {
  circle,
  defs,
  ellipse,
  g,
  line,
  path,
  polygon,
  polyline,
  rect,
  svg,
  svgEl,
  textEl,
  titleEl,
  useEl,
} from "./svg";
export type { SvgAttribute, SvgProps } from "./svgTypes";

export { icon } from "./icons";
export type { IconNode } from "./icons";

export { PALETTE } from "./utilities/colors";
export type { PaletteName, Shade } from "./utilities/colors";
export {
  BREAKPOINT,
  MAX_WIDTH,
  RADIUS,
  SHADOW,
  SPACE,
  TEXT,
} from "./utilities/scales";
export type {
  Breakpoint,
  MaxWidth,
  Radius,
  Shadow,
  Space,
  TextSize,
} from "./utilities/scales";
export { theme, themes } from "./utilities/theme";
export type {
  ColorMode,
  ColorScale,
  ColorTheme,
  ColorThemeInput,
} from "./utilities/theme";
