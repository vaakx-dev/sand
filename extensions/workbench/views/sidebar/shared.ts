import { div, span, type Child } from "@vaakx-dev/vrui";

import { styled } from "sand:api/ui";

const View = styled(div, {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

const Header = styled(div, {
  height: "var(--header-height)",
  flex: "0 0 var(--header-height)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--space-medium)",
  padding: "0 var(--space-medium)",
});

const Title = styled(span, {
  color: "var(--text)",
  fontSize: "var(--font-small)",
  fontWeight: "var(--weight-semibold)",
  letterSpacing: "var(--tracking-wide)",
});

export function sidebarView(
  title: string,
  actions: Child,
  ...children: Child[]
): HTMLElement {
  return View({}, Header({}, Title({}, title), actions), ...children);
}
