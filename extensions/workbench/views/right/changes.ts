import { div, el } from "@vaakx-dev/vrui";

import type { WorkbenchState } from "../../state.ts";

export function changesView(state: WorkbenchState): HTMLElement {
  return div(
    { class: "changes-view" },
    div({ class: "git-status" }, state.gitStatus.map((value) => value || "No Git changes")),
    el(
      "pre",
      { class: ["diff-output", { wrapped: state.wordWrap }] },
      state.gitDiff.map((value) => value || "Working tree has no unstaged changes."),
    ),
  );
}
