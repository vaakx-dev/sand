import { button } from "@vaakx-dev/vrui";
import { css } from "@emotion/css";

import type {
  IconButtonOptions,
  IconButtonVariant,
  Value,
} from "../api.ts";
import { tokens } from "../tokens.ts";
import { busy, busyIcon } from "./busy.ts";

const GEOMETRY: Record<IconButtonVariant, { control: number; icon: number; radius: number }> = {
  standard: { control: tokens.size.control, icon: tokens.size.icon, radius: tokens.radius.control },
  compact: {
    control: tokens.size.controlCompact,
    icon: tokens.size.iconCompact,
    radius: tokens.radius.compact,
  },
  dense: {
    control: tokens.size.control,
    icon: tokens.size.iconCompact,
    radius: tokens.radius.control,
  },
  round: { control: tokens.size.controlLarge, icon: tokens.size.icon, radius: tokens.radius.round },
  window: { control: tokens.size.header, icon: tokens.size.iconCompact, radius: 0 },
};

const base = css({
  display: "inline-grid",
  placeItems: "center",
  flex: "none",
  padding: 0,
  color: "var(--muted)",
  background: "transparent",
  cursor: "pointer",
  "&:not(:disabled):hover:not(.active)": {
    color: "var(--text)",
    background: "var(--surface)",
  },
  "&.active": {
    color: "var(--text)",
    background: "var(--elevated)",
  },
  "&[data-tone=danger]:not(:disabled):hover": {
    color: "white",
    background: "var(--danger)",
  },
  "> .vrui-icon > svg": { width: "100%", height: "100%" },
});

const variants = Object.fromEntries(
  Object.entries(GEOMETRY).map(([variant, geometry]) => [
    variant,
    css({
      "--button-icon-size": `${geometry.icon}px`,
      width: geometry.control,
      minWidth: geometry.control,
      maxWidth: geometry.control,
      height: geometry.control,
      minHeight: geometry.control,
      maxHeight: geometry.control,
      borderRadius: geometry.radius,
    }),
  ]),
) as Record<IconButtonVariant, string>;

export function iconButton(options: IconButtonOptions): HTMLButtonElement {
  const variant = options.variant ?? "standard";
  const label = reactive(options.label);
  const selected = optional(options.selected);
  return button(
    {
      type: "button",
      class: [base, busyIcon, variants[variant], options.className, { active: selected }],
      hidden: optional(options.hidden),
      disabled: optional(options.disabled),
      "aria-label": label,
      "aria-busy": busy(options.busy),
      "aria-pressed": selected,
      "data-role": options.dataRole,
      "data-tone": options.tone ?? "default",
      onClick: options.onClick,
    },
    options.renderIcon(GEOMETRY[variant].icon),
  );
}

function reactive<T>(value: Value<T>): T | (() => T) {
  if (readable(value)) return () => value.get();
  return value;
}

function optional<T>(value: Value<T> | undefined): T | (() => T) | undefined {
  return value === undefined ? undefined : reactive(value);
}

function readable<T>(value: Value<T>): value is { get(): T } {
  return typeof value === "object"
    && value !== null
    && "get" in value
    && typeof value.get === "function";
}
