import type { icon } from "@vaakx-dev/vrui";
import { Files, GitCompare, Globe2, ListTodo, SquareTerminal } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { RightView } from "../../models.ts";
import { openPanel, restorePanel } from "../../panel.ts";
import type { WorkbenchState } from "../../state.ts";

export type SurfaceId = RightView | "terminal";

export interface SurfaceDescription {
  id: SurfaceId;
  label: string;
  description: string;
  icon: Parameters<typeof icon>[0];
}

export const SURFACES: readonly SurfaceDescription[] = [
  { id: "browser", label: "Browser", description: "Open a local app or URL.", icon: Globe2 },
  { id: "tasks", label: "Plan", description: "Show agent steps and activity.", icon: ListTodo },
  {
    id: "terminal",
    label: "Terminal",
    description: "Start a shell in this workspace.",
    icon: SquareTerminal,
  },
  { id: "files", label: "Files", description: "Browse and read workspace files.", icon: Files },
  {
    id: "changes",
    label: "Diff",
    description: "Review changes in this thread.",
    icon: GitCompare,
  },
];

export function openSurface(
  controller: WorkbenchController,
  state: WorkbenchState,
  surface: SurfaceId,
): void {
  state.rightAddOpen.set(false);
  if (surface === "terminal") {
    restorePanel(state);
    void controller.terminal.show();
    void controller.preferences.saveLayout();
    return;
  }
  openPanel(state, surface);
  if (surface === "changes") void controller.git.refresh();
  void controller.preferences.saveLayout();
}
