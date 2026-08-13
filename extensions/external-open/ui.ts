import { icon } from "@vaakx-dev/vrui";
import { Code2, FolderOpen } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { useUi } from "sand:api/ui";
import { useWorkbench, workbenchSlots } from "sand:api/workbench";
import { commands } from "./api.ts";

const extension: UiExtension = {
  activate(context) {
    const ui = useUi(context.apis);
    const workbench = useWorkbench(context.apis);
    workbench.slots.register({
      id: "external-open.menu",
      slot: workbenchSlots.topbarActions,
      order: 0,
      node: ui.menuButton({
        label: "Open",
        trigger: "toolbar",
        renderIcon: (size) => icon(FolderOpen, size),
        items: [
          {
            label: "VS Code",
            shortcut: "Ctrl+O",
            renderIcon: (size) => icon(Code2, size),
            run: () => context.runtime.command(commands.vscode),
          },
          {
            label: "Explorer",
            renderIcon: (size) => icon(FolderOpen, size),
            run: () => context.runtime.command(commands.explorer),
          },
        ],
      }),
    });
    workbench.commands.register({
      id: "external.open",
      label: "Workspace: Open",
      keybinding: "Ctrl+O",
      run: () => context.runtime.command(commands.vscode),
    });
  },
};

export default extension;
