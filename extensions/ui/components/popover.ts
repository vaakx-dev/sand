import { div, onWindow, type Child } from "@vaakx-dev/vrui";

import type { PopoverOptions } from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";

const Layer = styled(div, {
  position: "absolute",
  inset: 0,
  zIndex: "calc(var(--z-popover) - 1)",
  pointerEvents: "none",
});

const Surface = styled(div, {
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: "var(--z-popover)",
  width: `min(var(--popover-width), calc(100vw - ${tokens.space.page}px))`,
  maxHeight: `calc(100vh - ${tokens.space.section}px)`,
  padding: "var(--popover-padding)",
  overflow: "auto",
  border: "1px solid var(--outline)",
  borderRadius: tokens.radius.surface,
  color: "var(--text)",
  background: "var(--panel)",
  boxShadow: "0 18px 60px #000a",
  pointerEvents: "auto",
});

export function popover(options: PopoverOptions, ...children: Child[]): HTMLElement {
  return Layer(
    {
      onMount: (element) => onWindow(element, "pointerdown", (event) => {
        if (!element.parentElement?.contains(event.target as Node)) options.onDismiss();
      }),
    },
    Surface(
      {
        style: {
          "--popover-width": `${options.width ?? 256}px`,
          "--popover-padding": `${options.padding ?? tokens.space.small}px`,
        },
        onMount: (element) => position(element, options.anchor, options.align ?? "start"),
        onPointerDown: (event) => event.stopPropagation(),
      },
      ...children,
    ),
  );
}

function position(
  element: HTMLElement,
  anchor: HTMLElement,
  align: "start" | "end",
): () => void {
  const place = () => {
    const inset = tokens.space.medium;
    const gap = tokens.space.small;
    const anchorBounds = anchor.getBoundingClientRect();

    element.style.maxHeight = "none";
    element.style.setProperty("--popover-available-height", `${window.innerHeight}px`);
    const naturalHeight = element.getBoundingClientRect().height;
    const above = Math.max(0, anchorBounds.top - gap - inset);
    const below = Math.max(0, window.innerHeight - anchorBounds.bottom - gap - inset);
    const opensAbove = naturalHeight <= above || (naturalHeight > below && above >= below);
    const available = opensAbove ? above : below;

    element.style.maxHeight = `${available}px`;
    element.style.setProperty(
      "--popover-available-height",
      `${Math.max(0, available - verticalFrame(element))}px`,
    );

    const bounds = element.getBoundingClientRect();
    const preferredLeft = align === "end"
      ? anchorBounds.right - bounds.width
      : anchorBounds.left;
    element.style.left = `${clamp(preferredLeft, inset, window.innerWidth - bounds.width - inset)}px`;
    element.style.top = `${opensAbove
      ? anchorBounds.top - gap - bounds.height
      : anchorBounds.bottom + gap}px`;
  };
  const repositionAfterScroll = (event: Event) => {
    if (event.target instanceof Node && element.contains(event.target)) return;
    place();
  };

  place();
  const frame = window.requestAnimationFrame(place);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", repositionAfterScroll, true);
  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", repositionAfterScroll, true);
  };
}

function verticalFrame(element: HTMLElement): number {
  const style = getComputedStyle(element);
  return value(style.paddingTop)
    + value(style.paddingBottom)
    + value(style.borderTopWidth)
    + value(style.borderBottomWidth);
}

function value(length: string): number {
  return Number.parseFloat(length) || 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, Math.max(minimum, maximum)));
}
