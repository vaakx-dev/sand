import { div, dynamicChild, icon, sig, span } from "@vaakx-dev/vrui";
import { ChevronDown } from "lucide";

import type { MenuButtonOptions } from "../api.ts";
import { uiButton } from "../controls/button.ts";
import { iconButton } from "../controls/icon_button.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";
import { menu, valueOf } from "./menu.ts";

const Root = styled(div, {
  position: "relative",
  minWidth: 0,
});

const Popup = styled(div, {
  position: "absolute",
  top: `calc(100% + ${tokens.space.small}px)`,
  zIndex: "var(--z-menu)",
  "&[data-align=start]": { left: 0 },
  "&[data-align=end]": { right: 0 },
});

export function menuButton(options: MenuButtonOptions): HTMLElement {
  const open = options.open ?? sig(false);
  const setOpen = (value: boolean) => {
    open.set(value);
    options.onOpenChange?.(value);
  };
  const toggle = () => setOpen(!open.get());
  return Root(
    { hidden: optional(options.hidden) },
    trigger(options, open, toggle),
    dynamicChild(() => open.get(), (visible) => visible
      ? Popup(
          { "data-align": options.align ?? "start" },
          menu({
            items: options.items,
            width: options.width,
            align: options.align,
            onDismiss: () => setOpen(false),
          }),
        )
      : div({ hidden: true })),
  );
}

function trigger(
  options: MenuButtonOptions,
  open: { get(): boolean },
  toggle: () => void,
): HTMLButtonElement {
  const kind = options.trigger ?? "button";
  if (kind === "icon") {
    if (!options.renderIcon) throw new Error("icon menu buttons require renderIcon");
    return iconButton({
      label: options.label,
      renderIcon: options.renderIcon,
      selected: () => open.get() || Boolean(options.selected && valueOf(options.selected)),
      disabled: options.disabled,
      onClick: toggle,
    });
  }
  return uiButton(
    {
      type: "button",
      variant: kind === "toolbar" ? "toolbar" : kind === "selector" ? "selector" : "secondary",
      disabled: optional(options.disabled),
      "aria-expanded": () => open.get(),
      "aria-haspopup": "menu",
      onClick: toggle,
    },
    options.renderIcon?.(tokens.size.icon),
    span(reactive(options.label)),
    icon(ChevronDown, tokens.size.iconTiny),
  );
}

function reactive<T>(value: T | (() => T) | { get(): T }): T | (() => T) {
  return typeof value === "function"
    || (typeof value === "object" && value !== null && "get" in value)
    ? () => valueOf(value)
    : value;
}

function optional<T>(
  value: T | (() => T) | { get(): T } | undefined,
): T | (() => T) | undefined {
  return value === undefined ? undefined : reactive(value);
}
