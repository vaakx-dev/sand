import { icon, show } from "@vaakx-dev/vrui";
import { GitBranch, GitCompare, RefreshCw } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { useUi } from "sand:api/ui";
import { useWorkbench, workbenchSlots } from "sand:api/workbench";
import { GitController } from "./controller.ts";
import { createGitState } from "./state.ts";
import { changesView } from "./view.ts";

const extension: UiExtension = {
  async activate(context) {
    const ui = useUi(context.apis);
    const workbench = useWorkbench(context.apis);
    const state = createGitState();
    const controller = new GitController(context.runtime, workbench.surfaces, state);

    workbench.slots.register({
      id: "git.initialize",
      slot: workbenchSlots.topbarActions,
      order: 10,
      node: show(state.repository.map((repository) => !repository), () => ui.button(
        {
          variant: "toolbar",
          onClick: () => void controller.initialize(),
        },
        icon(GitBranch, ui.tokens.size.iconCompact),
        "Initialize Git",
      )),
    });
    workbench.surfaces.register({
      id: "changes",
      label: "Diff",
      description: "Review workspace changes.",
      order: 40,
      available: () => controller.available(),
      renderIcon: (size) => icon(GitCompare, size),
      renderActions: () => ui.iconButton({
        label: "Refresh changes",
        renderIcon: (size) => icon(RefreshCw, size),
        onClick: () => void controller.refresh(),
      }),
      render: () => changesView(state),
    });
    workbench.commands.register({
      id: "changes.show",
      label: "View: Changes",
      keybinding: "Ctrl+Shift+G",
      run: () => workbench.surfaces.open("changes"),
    });
    workbench.commands.register({
      id: "git.initialize",
      label: "Git: Initialize Repository",
      run: () => controller.initialize(),
    });
    context.runtime.subscribe((event) => controller.onRuntimeEvent(event));
    context.runtime.subscribeWorkspace(() => controller.onWorkspaceSelected());
    workbench.events.subscribe((event) => controller.onUiEvent(event));
    await controller.refresh();
  },
};

export default extension;
