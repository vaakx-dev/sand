import { button, type MaybeReactive } from "@vaakx-dev/vrui";

interface IconButtonOptions {
  label: MaybeReactive<string>;
  onClick: () => void;
  selected?: MaybeReactive<boolean>;
  disabled?: MaybeReactive<boolean>;
  expanded?: MaybeReactive<boolean>;
}

export function iconButton(
  options: IconButtonOptions,
  content: HTMLElement,
): HTMLElement {
  return button(
    {
      class: ["icon-button", { active: options.selected ?? false }],
      "aria-label": options.label,
      "aria-pressed": options.selected,
      "aria-expanded": options.expanded,
      "aria-haspopup": options.expanded === undefined ? undefined : "menu",
      "data-tooltip": options.label,
      disabled: options.disabled,
      onClick: options.onClick,
    },
    content,
  );
}
