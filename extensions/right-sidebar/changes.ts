import { div, el } from "@vaakx-dev/vrui";

import type { RightState } from "./state.ts";

export function changesView(state: RightState): HTMLElement {
  return div(
    { class: "changes-view" },
    div({ class: "git-status" }, state.gitStatus.map((value) => value || "No Git changes")),
    el(
      "pre",
      { class: "diff-output" },
      state.gitDiff.map((value) => value || "Working tree has no unstaged changes."),
    ),
  );
}
