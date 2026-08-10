import { div, el, show } from "@vaakx-dev/vrui";

import type { GitState } from "./state.ts";

export function changesView(state: GitState): HTMLElement {
  return div(
    { class: "changes-view" },
    show(state.error.map(Boolean), () => div({ class: "changes-error" }, state.error)),
    div({ class: "git-status" }, state.status.map((value) => value || "No Git changes")),
    el(
      "pre",
      { class: "diff-output" },
      state.diff.map((value) => value || "Working tree has no unstaged changes."),
    ),
  );
}
