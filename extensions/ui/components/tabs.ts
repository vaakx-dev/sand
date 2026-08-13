import { button, div, dynamicChild, icon, span, stopThen } from "@vaakx-dev/vrui";
import { X } from "lucide";

import type { TabsOptions } from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";
import { valueOf } from "./menu.ts";

const Header = styled(div, {
  position: "relative",
  zIndex: "var(--z-chrome)",
  height: "var(--header-height)",
  flex: "0 0 var(--header-height)",
  paddingInline: tokens.space.medium,
  display: "flex",
  alignItems: "center",
  gap: tokens.space.small,
  borderBottom: "1px solid var(--border)",
  background: "var(--background)",
  "&[data-variant=document]": {
    paddingInline: 0,
    background: "var(--panel)",
  },
});

const List = styled(div, {
  minWidth: 0,
  flex: 1,
  display: "flex",
  alignItems: "center",
  gap: tokens.space.compact,
  overflowX: "auto",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

const Tab = styled(div, {
  height: tokens.size.control,
  minWidth: 0,
  maxWidth: 160,
  padding: `0 ${tokens.space.small}px 0 ${tokens.space.medium}px`,
  display: "inline-flex",
  alignItems: "center",
  gap: tokens.space.small,
  borderRadius: tokens.radius.compact,
  color: "var(--muted)",
  cursor: "pointer",
  "&:hover": { color: "var(--text)", background: "var(--surface)" },
  "&[aria-selected=true]": { color: "var(--text)", background: "var(--elevated)" },
  "[data-variant=document] &": {
    minWidth: 96,
    maxWidth: 192,
    height: "var(--header-height)",
    borderRight: "1px solid var(--border)",
    borderRadius: 0,
  },
  "[data-variant=document] &[aria-selected=true]": { background: "var(--background)" },
});

const Dirty = styled(span, {
  width: tokens.size.indicator,
  height: tokens.size.indicator,
  flex: `0 0 ${tokens.size.indicator}px`,
  borderRadius: tokens.radius.round,
  background: "var(--text)",
});

const Label = styled(span, {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const Close = styled(button, {
  width: tokens.size.controlTiny,
  height: tokens.size.controlTiny,
  display: "grid",
  placeItems: "center",
  flex: "none",
  borderRadius: tokens.radius.compact,
  color: "var(--muted)",
  cursor: "pointer",
  "&:hover": { color: "var(--text)", background: "var(--elevated)" },
});

const Actions = styled(div, {
  minWidth: tokens.size.control,
  minHeight: tokens.size.control,
  display: "grid",
  placeItems: "center",
});

export function tabs<T>(options: TabsOptions<T>): HTMLElement {
  return Header(
    { "data-tauri-drag-region": "", "data-variant": options.variant ?? "panel" },
    dynamicChild(() => valueOf(options.items), (items) => List(
      { role: "tablist" },
      ...items.map((item) => Tab(
        {
          role: "tab",
          tabIndex: 0,
          "aria-selected": reactive(options.active, (active) => active === options.getId(item)),
          onClick: () => options.onSelect(item),
          onKeyDown: (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            options.onSelect(item);
          },
        },
        options.renderIcon?.(item, tokens.size.icon),
        options.isDirty?.(item) ? Dirty({}) : null,
        Label({}, options.getLabel(item)),
        options.onClose
          ? Close(
              {
                type: "button",
                "aria-label": `Close ${options.getLabel(item)}`,
                onClick: stopThen(() => options.onClose?.(item)),
              },
              icon(X, tokens.size.iconTiny),
            )
          : null,
      )),
    )),
    options.actions ? Actions({}, options.actions) : null,
  );
}

function reactive<T, U>(
  value: T | (() => T) | { get(): T },
  map: (value: T) => U,
): U | (() => U) {
  return typeof value === "function"
    || (typeof value === "object" && value !== null && "get" in value)
    ? () => map(valueOf(value))
    : map(value);
}
