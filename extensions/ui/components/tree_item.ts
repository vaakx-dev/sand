import { button, icon, span } from "@vaakx-dev/vrui";
import { ChevronDown, ChevronRight } from "lucide";

import type { TreeItemOptions, Value } from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";
import { valueOf } from "./menu.ts";

const Item = styled(button, {
  width: "100%",
  minWidth: 0,
  height: tokens.size.control,
  display: "flex",
  alignItems: "center",
  gap: tokens.space.small,
  paddingRight: tokens.space.medium,
  color: "var(--muted)",
  cursor: "pointer",
  textAlign: "left",
  whiteSpace: "nowrap",
  "&:not(:disabled):hover:not([aria-selected=true])": { color: "var(--text)", background: "var(--surface)" },
  "&[aria-selected=true]": { color: "var(--text)", background: "var(--elevated)" },
  "> .vrui-icon": { color: "var(--muted)" },
});

const Label = styled(span, {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export function treeItem(options: TreeItemOptions): HTMLButtonElement {
  return Item(
    {
      type: "button",
      "aria-selected": optional(options.selected),
      "aria-expanded": options.expanded,
      style: { paddingLeft: `${tokens.space.medium + (options.depth ?? 0) * tokens.size.icon}px` },
      onClick: options.onClick,
    },
    options.expanded === undefined
      ? null
      : icon(options.expanded ? ChevronDown : ChevronRight, tokens.size.iconCompact),
    options.renderIcon?.(tokens.size.iconCompact),
    Label({}, options.label),
  );
}

function optional<T>(value: Value<T> | undefined): T | (() => T) | undefined {
  if (value === undefined) return undefined;
  return typeof value === "function"
    || (typeof value === "object" && value !== null && "get" in value)
    ? () => valueOf(value)
    : value;
}
