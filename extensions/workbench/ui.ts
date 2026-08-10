import { errorMessage, type UiExtension } from "@sand/extension-api";

import { WorkbenchController } from "./controller.ts";
import { workbenchEvents } from "./api.ts";
import { createState } from "./state.ts";
import { shell } from "./views/shell.ts";

const extension: UiExtension = {
  async activate(context) {
    const state = createState();
    const controller = new WorkbenchController(context, state);

    context.ui.commands.register({
      id: "workbench.sidebar",
      label: "View: Toggle Sidebar",
      keybinding: "Ctrl+B",
      run: () => controller.toggleSidebar(),
    });
    context.ui.commands.register({
      id: "workbench.threads",
      label: "View: Threads",
      run: () => controller.navigation.show("threads"),
    });
    context.ui.commands.register({
      id: "workbench.extensions",
      label: "View: Extensions",
      run: () => controller.navigation.show("extensions"),
    });
    context.ui.commands.register({
      id: "workbench.settings",
      label: "View: Settings",
      run: () => controller.navigation.show("settings"),
    });
    context.ui.commands.register({
      id: "extensions.reload",
      label: "Extensions: Reload Host and UI",
      run: () => controller.preferences.reloadExtensions(),
    });

    state.commands.set(context.ui.commands.list());
    context.ui.commands.subscribe(() => state.commands.set(context.ui.commands.list()));
    context.ui.events.subscribe((event) => {
      if (event.kind === workbenchEvents.newThreadSelected) controller.threads.new();
    });
    context.ui.mount(shell(controller, state, context.ui));

    try {
      await controller.initialize();
    } catch (error) {
      state.notice.set(errorMessage(error));
    }
  },
};

export default extension;
