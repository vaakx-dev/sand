import { button } from "@vaakx-dev/vrui";

import type {
  UiControls,
  UiIconButtonOptions,
  UiIconButtonVariant,
  UiReadable,
  UiValue,
} from "@sand/extension-api";

import "./controls.css";

const ICON_SIZES: Record<UiIconButtonVariant, number> = {
  standard: 14,
  compact: 12,
  tiny: 11,
  dense: 13,
  round: 14,
  window: 13,
  rail: 18,
};

export class Controls implements UiControls {
  iconButton(options: UiIconButtonOptions): HTMLButtonElement {
    const variant = options.variant ?? "standard";
    const label = reactive(options.label);
    const selected = optional(options.selected);
    const tooltip = options.tooltip === false
      ? undefined
      : reactive(options.tooltip ?? options.label);
    const classes = Array.isArray(options.className)
      ? options.className
      : options.className
        ? [options.className]
        : [];
    return button(
      {
        type: "button",
        class: [
          "icon-button",
          `icon-button-${variant}`,
          ...classes,
          { active: selected },
        ],
        hidden: optional(options.hidden),
        disabled: optional(options.disabled),
        "aria-label": label,
        "aria-pressed": selected,
        "data-tooltip": tooltip,
        onClick: options.onClick,
      },
      options.renderIcon(ICON_SIZES[variant]),
    );
  }
}

function reactive<T>(value: UiValue<T>): T | (() => T) {
  if (readable(value)) return () => value.get();
  return value;
}

function optional<T>(value: UiValue<T> | undefined): T | (() => T) | undefined {
  return value === undefined ? undefined : reactive(value);
}

function readable<T>(value: UiValue<T>): value is UiReadable<T> {
  return typeof value === "object"
    && value !== null
    && "get" in value
    && typeof value.get === "function";
}
