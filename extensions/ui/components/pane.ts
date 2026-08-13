import { div, onWindow, type Child } from "@vaakx-dev/vrui";

import type { PaneOptions } from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";

const Host = styled(div, {
  position: "relative",
  width: "var(--pane-width)",
  minWidth: "var(--pane-min-width)",
  maxWidth: "var(--pane-max-width)",
  minHeight: 0,
  flex: "0 0 var(--pane-width)",
  "&[data-maximized=true]": {
    width: "calc(100vw - var(--workbench-sidebar-space, 0px))",
    maxWidth: "none",
    flexBasis: "calc(100vw - var(--workbench-sidebar-space, 0px))",
  },
  "@media (max-width: 800px)": {
    position: "fixed",
    inset: 0,
    zIndex: "var(--z-modal)",
    width: "100%",
    minWidth: 0,
    maxWidth: "none",
  },
});

const Grip = styled(div, {
  position: "absolute",
  zIndex: "var(--z-resizer)",
  inset: `0 auto 0 -${tokens.space.small}px`,
  width: tokens.space.medium,
  cursor: "col-resize",
  "&:hover": { background: "var(--accent)" },
  "[data-maximized=true] > &": { display: "none" },
});

const Shell = styled(div, {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  borderLeft: "1px solid var(--border)",
  background: "var(--background)",
  containerType: "inline-size",
});

const Content = styled(div, {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  display: "flex",
  overflow: "hidden",
});

export function pane(options: PaneOptions, ...children: Child[]): HTMLElement {
  let dragging = false;
  const maximized = reactive(options.maximized ?? false);
  return Host(
    {
      hidden: reactive(options.visible, (visible) => !visible),
      "data-maximized": maximized,
      style: {
        "--pane-width": reactive(options.width, (width) => `${width}px`),
        "--pane-min-width": `${options.minimumWidth ?? 320}px`,
        "--pane-max-width": `${options.maximumWidth ?? 896}px`,
      },
    },
    Grip({
      onPointerDown: (event) => {
        if (event.button !== 0 || valueOf(options.maximized ?? false)) return;
        dragging = true;
        document.body.classList.add("resizing");
        event.preventDefault();
      },
      onMount: (element) => {
        const move = onWindow(element, "pointermove", (raw) => {
          if (!dragging) return;
          options.onResize(window.innerWidth - (raw as PointerEvent).clientX);
        });
        const end = onWindow(element, "pointerup", () => {
          if (!dragging) return;
          dragging = false;
          document.body.classList.remove("resizing");
          options.onResizeEnd?.();
        });
        return () => {
          dragging = false;
          document.body.classList.remove("resizing");
          move();
          end();
        };
      },
    }),
    Shell({}, options.header, Content({}, ...children)),
  );
}

function valueOf<T>(value: T | (() => T) | { get(): T }): T {
  if (typeof value === "function") return (value as () => T)();
  if (typeof value === "object" && value !== null && "get" in value) return value.get();
  return value;
}

function reactive<T, U = T>(
  value: T | (() => T) | { get(): T },
  map: (value: T) => U = ((current: T) => current as unknown as U),
): U | (() => U) {
  return typeof value === "function"
    || (typeof value === "object" && value !== null && "get" in value)
    ? () => map(valueOf(value))
    : map(value);
}
