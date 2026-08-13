import { div, el, show } from "@vaakx-dev/vrui";

import { styled } from "sand:api/ui";
import type { GitState } from "./state.ts";

const Changes = styled(div, {
  minHeight: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
});

const ErrorNotice = styled(div, {
  padding: "var(--space-medium) var(--space-large)",
  borderBottom: "1px solid var(--border)",
  color: "var(--danger)",
  fontSize: "var(--font-caption)",
});

const Status = styled(div, {
  flex: "0 0 auto",
  maxHeight: 128,
  overflow: "auto",
  padding: "var(--space-medium) var(--space-large)",
  borderBottom: "1px solid var(--border)",
  color: "var(--muted)",
  font: "var(--font-small)/1.5 var(--mono)",
  whiteSpace: "pre-wrap",
});

const Diff = styled(el.bind(null, "pre"), {
  minHeight: 0,
  flex: 1,
  margin: 0,
  padding: "var(--space-large)",
  overflow: "auto",
  color: "var(--text)",
  font: "var(--font-small)/1.5 var(--mono)",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
});

export function changesView(state: GitState): HTMLElement {
  return Changes(
    {},
    show(state.error.map(Boolean), () => ErrorNotice({}, state.error)),
    Status({}, state.status.map((value) => value || "No Git changes")),
    Diff({}, state.diff.map((value) => value || "Working tree has no unstaged changes.")),
  );
}
