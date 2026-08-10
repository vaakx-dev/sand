import { errorMessage, type UiExtension } from "@sand/extension-api";

import { WorkbenchController } from "./controller.ts";
import { openPanel, togglePanel } from "./panel.ts";
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
      run: () => {
        state.sidebarOpen.toggle()();
        void controller.preferences.saveLayout();
      },
    });
    context.ui.commands.register({
      id: "workbench.rightPanel",
      label: "View: Toggle Files and Changes",
      run: () => {
        togglePanel(state);
        void controller.preferences.saveLayout();
      },
    });
    context.ui.commands.register({
      id: "workbench.threads",
      label: "View: Threads",
      run: () => state.activity.set("threads"),
    });
    context.ui.commands.register({
      id: "workbench.files",
      label: "View: Explorer",
      run: () => state.activity.set("explorer"),
    });
    context.ui.commands.register({
      id: "workbench.search",
      label: "View: Search",
      run: () => state.activity.set("search"),
    });
    context.ui.commands.register({
      id: "workbench.extensions",
      label: "View: Extensions",
      run: () => state.activity.set("extensions"),
    });
    context.ui.commands.register({
      id: "workbench.settings",
      label: "View: Settings",
      run: () => state.activity.set("settings"),
    });
    context.ui.commands.register({
      id: "workbench.save",
      label: "File: Save",
      keybinding: "Ctrl+S",
      run: () => controller.workspace.saveActive(),
    });
    context.ui.commands.register({
      id: "workbench.terminal",
      label: "View: Toggle Terminal",
      keybinding: "Ctrl+J",
      run: () => controller.terminal.toggle(),
    });
    context.ui.commands.register({
      id: "projects.switch",
      label: "Projects: Switch Project",
      keybinding: "Ctrl+K",
      run: () => controller.projects.openPicker("switch"),
    });
    context.ui.commands.register({
      id: "workbench.changes",
      label: "View: Changes",
      keybinding: "Ctrl+Shift+G",
      run: () => {
        openPanel(state, "changes");
        void controller.git.refresh();
      },
    });
    context.ui.commands.register({
      id: "workbench.open",
      label: "Workspace: Open",
      keybinding: "Ctrl+O",
      run: () => state.openMenuOpen.toggle()(),
    });
    context.ui.commands.register({
      id: "agent.new",
      label: "Agent: New Session",
      keybinding: "Ctrl+N",
      run: () => controller.projects.openPicker("newThread"),
    });
    context.ui.commands.register({
      id: "extensions.reload",
      label: "Extensions: Reload Host and UI",
      run: () => controller.preferences.reloadExtensions(),
    });

    state.commands.set(context.ui.commands.list());
    context.ui.commands.subscribe(() => state.commands.set(context.ui.commands.list()));
    context.ui.mount(shell(controller, state));

    try {
      await controller.initialize();
    } catch (error) {
      state.notice.set(errorMessage(error));
    }
  },
};

export default extension;
