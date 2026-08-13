import { button, div, dynamicChild, icon, onWindow, sig, span } from "@vaakx-dev/vrui";
import { Check, ChevronRight } from "lucide";

import type {
  ContextMenuOptions,
  MenuEntry,
  MenuItem,
  Value,
} from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";

const DEFAULT_WIDTH = 176;
const SUBMENU_WIDTH = 192;

const Menu = styled(div, {
  zIndex: "var(--z-menu)",
  padding: tokens.space.small,
  border: "1px solid var(--outline)",
  borderRadius: tokens.radius.surface,
  background: "var(--panel)",
  boxShadow: "0 18px 55px #000a",
});

const Item = styled(button, {
  width: "100%",
  minWidth: 0,
  height: tokens.size.controlLarge,
  display: "flex",
  alignItems: "center",
  gap: tokens.space.medium,
  paddingInline: tokens.space.medium,
  borderRadius: tokens.radius.control,
  color: "var(--text)",
  cursor: "pointer",
  textAlign: "left",
  "&:not(:disabled):hover, &:focus-visible": { background: "var(--surface)" },
  "&[data-tone=danger]": { color: "var(--danger)" },
});

const Label = styled(span, {
  minWidth: 0,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const Detail = styled(span, {
  color: "var(--muted)",
  fontSize: tokens.font.caption,
});

const IconSpace = styled(span, { width: tokens.size.iconCompact, flex: "none" });

const Separator = styled(div, {
  height: 1,
  margin: `${tokens.space.small}px`,
  background: "var(--border)",
});

const Submenu = styled(div, {
  position: "relative",
});

const SubmenuPanel = styled(div, {
  position: "absolute",
  top: -tokens.space.small,
  left: `calc(100% + ${tokens.space.small}px)`,
  zIndex: "var(--z-menu)",
});

const Layer = styled(div, {
  position: "fixed",
  inset: 0,
  zIndex: "var(--z-menu)",
});

const ContextSurface = styled(div, { position: "fixed" });

export interface MenuOptions {
  items: Value<readonly MenuEntry[]>;
  width?: number;
  align?: "start" | "end";
  autofocus?: boolean;
  onDismiss(): void;
}

export function menu(options: MenuOptions): HTMLElement {
  return dynamicChild(() => valueOf(options.items), (entries) => Menu(
    {
      role: "menu",
      tabIndex: -1,
      style: { width: `${options.width ?? DEFAULT_WIDTH}px` },
      onKeyDown: (event) => navigate(event, options.onDismiss),
      onMount: (element) => {
        const outside = onWindow(element, "pointerdown", (event) => {
          if (!element.parentElement?.contains(event.target as Node)) options.onDismiss();
        });
        if (options.autofocus !== false) {
          queueMicrotask(() => element.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
        }
        return outside;
      },
    },
    ...entries.map((entry) => entryNode(entry, options.onDismiss)),
  ));
}

export function contextMenu(options: ContextMenuOptions): HTMLElement {
  return Layer(
    {
      onPointerDown: options.onDismiss,
      onContextMenu: (event) => event.preventDefault(),
    },
    ContextSurface(
      {
        style: { left: `${options.x}px`, top: `${options.y}px` },
        onPointerDown: (event) => event.stopPropagation(),
        onMount: (element) => placeContextMenu(element, options.x, options.y),
      },
      menu(options),
    ),
  );
}

function entryNode(entry: MenuEntry, dismiss: () => void): HTMLElement {
  if ("separator" in entry) return Separator({ role: "separator" });
  if (entry.children) return submenu(entry, dismiss);
  return itemButton(entry, dismiss);
}

function itemButton(item: MenuItem, dismiss: () => void): HTMLButtonElement {
  return Item(
    {
      type: "button",
      role: "menuitem",
      disabled: optional(item.disabled),
      "data-tone": item.tone,
      onClick: () => {
        dismiss();
        void item.run?.();
      },
    },
    item.selected
      ? dynamicChild(() => valueOf(item.selected!), (selected) => selected
        ? icon(Check, tokens.size.iconCompact)
        : IconSpace({}))
      : item.renderIcon?.(tokens.size.iconCompact),
    Label({}, reactive(item.label)),
    item.shortcut ? Detail({}, reactive(item.shortcut)) : null,
  );
}

function submenu(item: MenuItem, dismiss: () => void): HTMLElement {
  const open = sig(false);
  return Submenu(
    {},
    Item(
      {
        type: "button",
        role: "menuitem",
        disabled: optional(item.disabled),
        "aria-haspopup": "menu",
        "aria-expanded": open,
        onClick: open.toggle(),
      },
      item.renderIcon?.(tokens.size.iconCompact),
      Label({}, reactive(item.label)),
      icon(ChevronRight, tokens.size.iconCompact),
    ),
    dynamicChild(open, (visible) => visible
      ? SubmenuPanel(
          { onMount: placeSubmenu },
          menu({ items: item.children!, width: SUBMENU_WIDTH, autofocus: false, onDismiss: dismiss }),
        )
      : span({ hidden: true })),
  );
}

function placeContextMenu(element: HTMLElement, x: number, y: number): void {
  const bounds = element.getBoundingClientRect();
  const inset = tokens.space.medium;
  element.style.left = `${clamp(x, inset, window.innerWidth - bounds.width - inset)}px`;
  element.style.top = `${clamp(y, inset, window.innerHeight - bounds.height - inset)}px`;
}

function placeSubmenu(element: HTMLElement): void {
  const inset = tokens.space.medium;
  let bounds = element.getBoundingClientRect();
  if (bounds.right > window.innerWidth - inset) {
    element.style.left = "auto";
    element.style.right = `calc(100% + ${tokens.space.small}px)`;
    bounds = element.getBoundingClientRect();
  }
  const overflow = bounds.bottom - (window.innerHeight - inset);
  if (overflow > 0) element.style.top = `${-tokens.space.small - overflow}px`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(value, Math.max(minimum, maximum)));
}

function navigate(event: KeyboardEvent, dismiss: () => void): void {
  if (event.key === "Escape") {
    dismiss();
    return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const buttons = [...(event.currentTarget as HTMLElement)
    .querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
  if (buttons.length === 0) return;
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const offset = event.key === "ArrowDown" ? 1 : -1;
  buttons[(current + offset + buttons.length) % buttons.length]?.focus();
  event.preventDefault();
}

export function valueOf<T>(value: Value<T>): T {
  if (typeof value === "function") return (value as () => T)();
  if (typeof value === "object" && value !== null && "get" in value) return value.get();
  return value;
}

function reactive<T>(value: Value<T>): T | (() => T) {
  return typeof value === "function"
    || (typeof value === "object" && value !== null && "get" in value)
    ? () => valueOf(value)
    : value;
}

function optional<T>(value: Value<T> | undefined): T | (() => T) | undefined {
  return value === undefined ? undefined : reactive(value);
}
