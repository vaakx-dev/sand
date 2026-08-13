import { button as element, type Child } from "@vaakx-dev/vrui";
import { css } from "@emotion/css";

import type { ButtonOptions } from "../api.ts";
import { tokens } from "../tokens.ts";
import { busy, busyIcon } from "./busy.ts";

const base = css({
  minHeight: tokens.size.control,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: tokens.space.medium,
  paddingInline: tokens.space.large,
  borderRadius: tokens.radius.control,
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontSize: tokens.font.small,
  fontWeight: tokens.weight.semibold,
});

const sizes = {
  compact: css({ minHeight: tokens.size.controlCompact, paddingInline: tokens.space.medium }),
  standard: "",
};

const variants = {
  primary: css({
    color: "var(--background)",
    background: "var(--text)",
    "&:not(:disabled):hover": { background: "var(--accent)" },
  }),
  secondary: css({
    border: "1px solid var(--border)",
    color: "var(--text)",
    background: "var(--surface)",
    "&:not(:disabled):hover": {
      borderColor: "var(--border)",
      background: "var(--elevated)",
    },
  }),
  ghost: css({
    gap: tokens.space.small,
    paddingInline: tokens.space.medium,
    color: "var(--muted)",
    background: "transparent",
    "&:not(:disabled):hover": { color: "var(--text)", background: "var(--surface)" },
  }),
  danger: css({
    color: "white",
    background: "var(--danger)",
    "&:not(:disabled):hover": { opacity: 0.9 },
  }),
  toolbar: css({
    minHeight: tokens.size.control,
    gap: tokens.space.small,
    paddingInline: tokens.space.medium,
    color: "var(--muted)",
    background: "transparent",
    fontSize: tokens.font.small,
    fontWeight: tokens.weight.medium,
    "&:not(:disabled):hover, &[aria-expanded=true]": {
      color: "var(--text)",
      background: "var(--surface)",
    },
  }),
  selector: css({
    width: "100%",
    minWidth: 0,
    minHeight: tokens.size.control,
    justifyContent: "flex-start",
    gap: tokens.space.small,
    paddingInline: tokens.space.medium,
    color: "var(--muted)",
    background: "transparent",
    fontSize: tokens.font.label,
    fontWeight: tokens.weight.medium,
    "&:not(:disabled):hover, &[aria-expanded=true]": {
      color: "var(--text)",
      background: "var(--surface)",
    },
    "> span": {
      minWidth: 0,
      flex: 1,
      overflow: "hidden",
      textAlign: "left",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  }),
};

export function uiButton(options: ButtonOptions, ...children: Child[]): HTMLButtonElement {
  const {
    variant = "secondary",
    size = "standard",
    className,
    busy: busyValue,
    ...props
  } = options;
  return element(
    {
      ...props,
      class: [base, busyIcon, variants[variant], sizes[size], className],
      "aria-busy": busy(busyValue),
    },
    ...children,
  );
}
