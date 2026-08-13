import { errorMessage, type UiExtension } from "@sand/extension-api";

import { WorkbenchController } from "./controller.ts";
import {
  WORKBENCH_API,
  workbenchEvents,
} from "./api.ts";
import { createState } from "./state.ts";
import { createWorkbenchService } from "./services/index.ts";
import { shell } from "./views/shell.ts";
import { useUi } from "sand:api/ui";

const extension: UiExtension = {
  async activate(context) {
    const ui = useUi(context.apis);
    const workbench = createWorkbenchService();
    context.apis.provide(WORKBENCH_API, workbench);
    const state = createState();
    const controller = new WorkbenchController(context, workbench, state);

    workbench.commands.register({
      id: "workbench.sidebar",
      label: "View: Toggle Sidebar",
      keybinding: "Ctrl+B",
      run: () => controller.toggleSidebar(),
    });
    workbench.commands.register({
      id: "workbench.threads",
      label: "View: Threads",
      run: () => controller.navigation.show("threads"),
    });
    workbench.commands.register({
      id: "workbench.extensions",
      label: "View: Extensions",
      run: () => controller.navigation.show("extensions"),
    });
    workbench.commands.register({
      id: "workbench.settings",
      label: "View: Settings",
      run: () => controller.navigation.show("settings"),
    });
    workbench.commands.register({
      id: "extensions.reload",
      label: "Extensions: Reload",
      run: () => controller.preferences.reloadExtensions(),
    });

    state.commands.set(workbench.commands.list());
    workbench.commands.subscribe(() => state.commands.set(workbench.commands.list()));
    workbench.providers.subscribe(() => void controller.refreshProviders());
    workbench.events.subscribe((event) => {
      if (event.kind === workbenchEvents.newThreadSelected) controller.threads.new();
      if (event.kind === workbenchEvents.providersChanged) void controller.refreshProviders();
      if (event.kind === workbenchEvents.notice && typeof event.payload === "string") {
        controller.notice(event.payload);
      }
    });
    context.mount(shell(controller, state, ui, workbench));

    try {
      await controller.initialize();
    } catch (error) {
      state.notice.set(errorMessage(error));
    }
  },
};

export default extension;
