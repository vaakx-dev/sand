import { button, div, span } from "@vaakx-dev/vrui";

import type { ListItemOptions, Value } from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";
import { valueOf } from "./menu.ts";

const Row = styled(button, {
  width: "100%",
  minWidth: 0,
  minHeight: tokens.size.controlLarge,
  display: "flex",
  alignItems: "center",
  gap: tokens.space.small,
  padding: `${tokens.space.small}px ${tokens.space.medium}px`,
  borderRadius: tokens.radius.row,
  color: "var(--muted)",
  cursor: "pointer",
  textAlign: "left",
  "&:not(:disabled):hover:not([aria-selected=true])": { color: "var(--text)", background: "var(--surface)" },
  "&[aria-selected=true]": { color: "var(--text)", background: "var(--elevated)" },
});

const Copy = styled(div, {
  minWidth: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.small,
});

const Label = styled(span, {
  minWidth: 0,
  overflow: "hidden",
  color: "inherit",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const Description = styled(span, {
  minWidth: 0,
  overflow: "hidden",
  color: "var(--muted)",
  fontSize: tokens.font.caption,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const Detail = styled(span, {
  flex: "none",
  color: "var(--muted)",
  fontSize: tokens.font.caption,
});

export function listItem(options: ListItemOptions): HTMLElement {
  return Row(
    {
      type: "button",
      disabled: optional(options.disabled),
      "aria-selected": optional(options.selected),
      onClick: options.onClick,
    },
    options.renderIcon?.(tokens.size.icon),
    Copy(
      {},
      Label({}, options.label),
      options.description ? Description({}, options.description) : null,
    ),
    options.detail ? Detail({}, options.detail) : null,
  );
}

function optional<T>(value: Value<T> | undefined): T | (() => T) | undefined {
  if (value === undefined) return undefined;
  return typeof value === "function"
    || (typeof value === "object" && value !== null && "get" in value)
    ? () => valueOf(value)
    : value;
}
