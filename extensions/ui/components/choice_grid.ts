import { button, div, dynamicChild, span } from "@vaakx-dev/vrui";

import type { ChoiceGridOptions, ChoiceItem } from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";
import { valueOf } from "./menu.ts";

const Grid = styled(div, {
  width: "min(480px, 100%)",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: tokens.space.medium,
  "@container (max-width: 400px)": { gridTemplateColumns: "minmax(0, 1fr)" },
});

const Card = styled(button, {
  minWidth: 0,
  minHeight: 112,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: tokens.space.medium,
  padding: tokens.space.section,
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.surface,
  color: "var(--muted)",
  background: "var(--panel)",
  cursor: "pointer",
  textAlign: "left",
  "&:not(:disabled):hover": {
    color: "var(--text)",
    borderColor: "var(--border)",
    background: "var(--surface)",
  },
});

const Label = styled(span, {
  color: "inherit",
  fontSize: tokens.font.label,
  fontWeight: tokens.weight.semibold,
});

const Description = styled(span, {
  color: "var(--muted)",
  fontSize: tokens.font.small,
  lineHeight: tokens.line.body,
});

export function choiceGrid<T extends ChoiceItem>(options: ChoiceGridOptions<T>): HTMLElement {
  return dynamicChild(() => valueOf(options.items), (items) => Grid(
    {},
    ...items.map((item) => Card(
      {
        type: "button",
        disabled: item.disabled,
        onClick: () => options.onSelect(item),
      },
      item.renderIcon?.(tokens.size.icon),
      Label({}, item.label),
      item.description ? Description({}, item.description) : null,
    )),
  ));
}
