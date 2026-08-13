import { div, span, type Child } from "@vaakx-dev/vrui";

import type { ModalBodyOptions, ModalHeaderOptions, ModalOptions, ShortcutHint } from "../api.ts";
import { styled } from "../styled.ts";
import { tokens } from "../tokens.ts";

const Layer = styled(div, {
  position: "fixed",
  inset: 0,
  zIndex: "var(--z-modal)",
  display: "grid",
  placeItems: "start center",
  paddingTop: "min(12vh, 96px)",
  background: "#0008",
});

const Dialog = styled(div, {
  width: `min(var(--modal-width), calc(100vw - ${tokens.space.page}px))`,
  maxHeight: `min(640px, calc(100vh - ${tokens.size.header * 2}px))`,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: "1px solid var(--outline)",
  borderRadius: tokens.radius.dialog,
  background: "var(--panel)",
  boxShadow: "0 30px 100px #000c",
});

const Footer = styled(div, {
  minHeight: "var(--header-height)",
  flex: "0 0 var(--header-height)",
  display: "flex",
  alignItems: "center",
  gap: tokens.space.small,
  paddingInline: tokens.space.large,
  borderTop: "1px solid var(--border)",
  color: "var(--muted)",
  fontSize: tokens.font.caption,
});

const Header = styled(div, {
  minHeight: tokens.size.headerLarge,
  flex: `0 0 ${tokens.size.headerLarge}px`,
  display: "flex",
  alignItems: "center",
  gap: tokens.space.medium,
  paddingInline: tokens.space.medium,
  color: "var(--muted)",
});

const HeaderTitle = styled(span, { color: "var(--text)", fontSize: tokens.font.body, fontWeight: tokens.weight.semibold });

const Body = styled(div, {
  minHeight: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: tokens.space.large,
  padding: `0 ${tokens.space.section}px ${tokens.space.section}px`,
  "&[data-variant=list]": {
    gap: 0,
    padding: `0 ${tokens.space.medium}px ${tokens.space.medium}px`,
    overflowY: "auto",
  },
});

const Actions = styled(div, {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: tokens.space.medium,
});

const Key = styled(span, {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: tokens.size.controlTiny,
  paddingInline: tokens.space.small,
  border: "1px solid var(--border)",
  borderRadius: tokens.radius.compact,
  color: "var(--muted)",
  font: `${tokens.font.caption}px var(--mono)`,
});

export function modal(options: ModalOptions, ...children: Child[]): HTMLElement {
  return Layer(
    { onClick: options.onDismiss },
    Dialog(
      {
        role: "dialog",
        "aria-label": options.label,
        style: { "--modal-width": `${options.width ?? 576}px` },
        onClick: (event) => event.stopPropagation(),
      },
      ...children,
    ),
  );
}

export function shortcutBar(items: readonly ShortcutHint[]): HTMLElement {
  return Footer(
    {},
    ...items.flatMap((item) => [Key({}, item.keys), span(item.label)]),
  );
}

export function modalBody(options: ModalBodyOptions, ...children: Child[]): HTMLElement {
  const { variant = "form", ...props } = options;
  return Body({ ...props, "data-variant": variant }, ...children);
}

export function modalActions(...children: Child[]): HTMLElement {
  return Actions({}, ...children);
}

export function modalHeader(options: ModalHeaderOptions): HTMLElement {
  return Header(
    {},
    options.leading,
    options.title ? HeaderTitle({}, options.title) : null,
    options.content,
  );
}
