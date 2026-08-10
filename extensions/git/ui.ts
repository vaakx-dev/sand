import { button, icon, show } from "@vaakx-dev/vrui";
import { GitBranch, GitCompare, RefreshCw } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { workbenchSlots } from "../workbench/api.ts";
import { GitController } from "./controller.ts";
import { createGitState } from "./state.ts";
import { changesView } from "./view.ts";

const extension: UiExtension = {
  async activate(context) {
    const state = createGitState();
    const controller = new GitController(context.runtime, context.ui.surfaces, state);

    context.ui.slots.register({
      id: "git.initialize",
      slot: workbenchSlots.topbarActions,
      order: 10,
      node: show(state.repository.map((repository) => !repository), () => button(
        {
          class: "top-action",
          "data-tooltip": "Initialize Git",
          onClick: () => void controller.initialize(),
        },
        icon(GitBranch, 13),
        "Initialize Git",
      )),
    });
    context.ui.surfaces.register({
      id: "changes",
      label: "Diff",
      description: "Review workspace changes.",
      order: 40,
      available: () => controller.available(),
      renderIcon: (size) => icon(GitCompare, size),
      renderActions: () => context.ui.controls.iconButton({
        label: "Refresh changes",
        renderIcon: (size) => icon(RefreshCw, size),
        onClick: () => void controller.refresh(),
      }),
      render: () => changesView(state),
    });
    context.ui.commands.register({
      id: "changes.show",
      label: "View: Changes",
      keybinding: "Ctrl+Shift+G",
      run: () => context.ui.surfaces.open("changes"),
    });
    context.ui.commands.register({
      id: "git.initialize",
      label: "Git: Initialize Repository",
      run: () => controller.initialize(),
    });
    context.runtime.subscribe((event) => controller.onRuntimeEvent(event));
    context.ui.events.subscribe((event) => controller.onUiEvent(event));
    await controller.refresh();
  },
};

export default extension;
