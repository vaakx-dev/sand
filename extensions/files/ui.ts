import { icon } from "@vaakx-dev/vrui";
import { Files as FilesIcon } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { FilesController } from "./controller.ts";
import { createFilesState } from "./state.ts";
import { filesView } from "./view.ts";

const extension: UiExtension = {
  async activate(context) {
    const state = createFilesState();
    const controller = new FilesController(context.runtime, context.ui.surfaces, state);

    context.ui.surfaces.register({
      id: "files",
      label: "Files",
      description: "Browse, search, and edit workspace files.",
      order: 30,
      renderIcon: (size) => icon(FilesIcon, size),
      render: () => filesView(controller, state, context.ui.controls),
    });
    context.ui.commands.register({
      id: "files.show",
      label: "View: Files",
      run: () => controller.show(),
    });
    context.ui.commands.register({
      id: "files.save",
      label: "File: Save",
      keybinding: "Ctrl+S",
      run: () => controller.save(),
    });
    context.ui.commands.register({
      id: "files.refresh",
      label: "Files: Refresh",
      run: () => controller.refresh(),
    });
    context.ui.events.subscribe((event) => controller.onUiEvent(event));
    context.runtime.subscribe((event) => controller.onRuntimeEvent(event));
    context.runtime.subscribeWorkspace((workspace) => controller.onWorkspaceSelected(workspace));
    await controller.initialize();
  },
};

export default extension;
