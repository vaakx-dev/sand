// ============================================================
// vrui - event helpers
// ============================================================

export type EventHandler<E extends Event = Event> = (event: E) => void;

/**
 * Browser events supported by declarative `on*` props.
 *
 * Each name follows the runtime convention: remove `on` and lowercase the
 * remainder to obtain the browser event name. Custom events intentionally do
 * not belong here; attach those with `listen`.
 */
export type EventPropName =
  | "onAbort"
  | "onAnimationCancel"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onAnimationStart"
  | "onAuxClick"
  | "onBeforeInput"
  | "onBeforeMatch"
  | "onBeforeToggle"
  | "onBlur"
  | "onCancel"
  | "onCanPlay"
  | "onCanPlayThrough"
  | "onChange"
  | "onClick"
  | "onClose"
  | "onCompositionEnd"
  | "onCompositionStart"
  | "onCompositionUpdate"
  | "onContextLost"
  | "onContextMenu"
  | "onContextRestored"
  | "onCopy"
  | "onCueChange"
  | "onCut"
  | "onDblClick"
  | "onDrag"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragLeave"
  | "onDragOver"
  | "onDragStart"
  | "onDrop"
  | "onDurationChange"
  | "onEmptied"
  | "onEnded"
  | "onError"
  | "onFocus"
  | "onFocusIn"
  | "onFocusOut"
  | "onFormData"
  | "onGotPointerCapture"
  | "onInput"
  | "onInvalid"
  | "onKeyDown"
  | "onKeyPress"
  | "onKeyUp"
  | "onLoad"
  | "onLoadedData"
  | "onLoadedMetadata"
  | "onLoadStart"
  | "onLostPointerCapture"
  | "onMouseDown"
  | "onMouseEnter"
  | "onMouseLeave"
  | "onMouseMove"
  | "onMouseOut"
  | "onMouseOver"
  | "onMouseUp"
  | "onPaste"
  | "onPause"
  | "onPlay"
  | "onPlaying"
  | "onPointerCancel"
  | "onPointerDown"
  | "onPointerEnter"
  | "onPointerLeave"
  | "onPointerMove"
  | "onPointerOut"
  | "onPointerOver"
  | "onPointerRawUpdate"
  | "onPointerUp"
  | "onProgress"
  | "onRateChange"
  | "onReset"
  | "onResize"
  | "onScroll"
  | "onScrollEnd"
  | "onSecurityPolicyViolation"
  | "onSeeked"
  | "onSeeking"
  | "onSelect"
  | "onSelectionChange"
  | "onSelectStart"
  | "onSlotChange"
  | "onStalled"
  | "onSubmit"
  | "onSuspend"
  | "onTimeUpdate"
  | "onToggle"
  | "onTouchCancel"
  | "onTouchEnd"
  | "onTouchMove"
  | "onTouchStart"
  | "onTransitionCancel"
  | "onTransitionEnd"
  | "onTransitionRun"
  | "onTransitionStart"
  | "onVolumeChange"
  | "onWaiting"
  | "onWheel";

export type EventNameFromProp<P extends EventPropName> =
  P extends `on${infer Name}`
    ? Lowercase<Name> & keyof GlobalEventHandlersEventMap
    : never;

type InputEventFor<E extends Element> =
  E extends HTMLInputElement | HTMLTextAreaElement ? InputEvent : Event;

type EventFor<
  E extends Element,
  Name extends keyof GlobalEventHandlersEventMap,
> = Name extends "click"
  ? MouseEvent
  : Name extends "input"
    ? InputEventFor<E>
    : Name extends `pointer${string}`
      ? PointerEvent
      : GlobalEventHandlersEventMap[Name];

/** Exact declarative event props for an element. */
export type EventProps<E extends Element = Element> = {
  [P in EventPropName]?: EventHandler<
    EventFor<E, EventNameFromProp<P>>
  > | undefined;
};

export function eventNameFromProp(key: string): string {
  return key.slice(2).toLowerCase();
}

export type EventOptions = {
  prevent?: boolean;
  stop?: boolean;
  self?: boolean;
};

export const stop: EventHandler = (event) => {
  event.stopPropagation();
};

export const prevent: EventHandler = (event) => {
  event.preventDefault();
};

export function event<E extends Event>(
  fn?: EventHandler<E>,
  options: EventOptions = {},
): EventHandler<E> {
  return (ev) => {
    if (options.self && ev.target !== ev.currentTarget) return;
    if (options.prevent) ev.preventDefault();
    if (options.stop) ev.stopPropagation();
    if (fn) fn(ev);
  };
}

export function stopThen<E extends Event>(fn?: EventHandler<E>): EventHandler<E> {
  return event(fn, { stop: true });
}

export function preventThen<E extends Event>(fn?: EventHandler<E>): EventHandler<E> {
  return event(fn, { prevent: true });
}

export type KeyHandler = EventHandler<KeyboardEvent>;

export type KeyMap = Record<string, KeyHandler | null | undefined | false>;

export type KeyOptions = EventOptions & {
  /**
   * Defaults to true. Set repeat: false to ignore held-key repeat events.
   */
  repeat?: boolean;
};

export function keys(map: KeyMap, options: KeyOptions = {}): EventHandler<KeyboardEvent> {
  const shouldPrevent = options.prevent ?? true;

  return (ev) => {
    if (options.self && ev.target !== ev.currentTarget) return;
    if (options.repeat === false && ev.repeat) return;

    const handler = map[ev.key];
    if (!handler) return;

    if (shouldPrevent) ev.preventDefault();
    if (options.stop) ev.stopPropagation();

    handler(ev);
  };
}
