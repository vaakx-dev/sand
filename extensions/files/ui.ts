import { icon } from "@vaakx-dev/vrui";
import { Files as FilesIcon } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { useUi } from "sand:api/ui";
import { useWorkbench } from "sand:api/workbench";
import { FilesController } from "./controller.ts";
import { createFilesState } from "./state.ts";
import { filesView } from "./view.ts";

const extension: UiExtension = {
  async activate(context) {
    const ui = useUi(context.apis);
    const workbench = useWorkbench(context.apis);
    const state = createFilesState();
    const controller = new FilesController(context.runtime, workbench.surfaces, state);

    workbench.surfaces.register({
      id: "files",
      label: "Files",
      description: "Browse, search, and edit workspace files.",
      order: 30,
      renderIcon: (size) => icon(FilesIcon, size),
      render: () => filesView(controller, state, ui),
    });
    workbench.commands.register({
      id: "files.show",
      label: "View: Files",
      run: () => controller.show(),
    });
    workbench.commands.register({
      id: "files.save",
      label: "File: Save",
      keybinding: "Ctrl+S",
      run: () => controller.save(),
    });
    workbench.commands.register({
      id: "files.refresh",
      label: "Files: Refresh",
      run: () => controller.refresh(),
    });
    workbench.events.subscribe((event) => controller.onUiEvent(event));
    context.runtime.subscribe((event) => controller.onRuntimeEvent(event));
    context.runtime.subscribeWorkspace((workspace) => controller.onWorkspaceSelected(workspace));
    await controller.initialize();
  },
};

export default extension;
