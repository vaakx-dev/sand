import { button, div, icon, onWindow, show, sig, span } from "@vaakx-dev/vrui";
import { ChevronDown, Code2, FolderOpen } from "lucide";

import type { UiExtension } from "@sand/extension-api";

import { workbenchSlots } from "../workbench/api.ts";
import { commands } from "./api.ts";

const extension: UiExtension = {
  activate(context) {
    const open = sig(false);
    const run = async (command: string) => {
      open.set(false);
      await context.runtime.command(command);
    };
    const node = div(
      { class: "open-action-wrap" },
      button(
        {
          class: ["top-action", { active: open }],
          "data-tooltip": "Open workspace",
          onClick: open.toggle(),
        },
        icon(FolderOpen, 13),
        "Open",
        icon(ChevronDown, 11),
      ),
      show(open, () => div(
        {
          class: "open-menu",
          onMount: (element) => onWindow(element, "pointerdown", (event) => {
            if (!element.parentElement?.contains(event.target as Node)) open.set(false);
          }),
        },
        button(
          { class: "open-menu-row", onClick: () => void run(commands.vscode) },
          icon(Code2, 14),
          span("VS Code"),
          span({ class: "open-shortcut" }, "Ctrl+O"),
        ),
        button(
          { class: "open-menu-row", onClick: () => void run(commands.explorer) },
          icon(FolderOpen, 14),
          span("Explorer"),
        ),
      )),
    );
    context.ui.slots.register({
      id: "external-open.menu",
      slot: workbenchSlots.topbarActions,
      order: 0,
      node,
    });
    context.ui.commands.register({
      id: "external.open",
      label: "Workspace: Open",
      keybinding: "Ctrl+O",
      run: open.toggle(),
    });
  },
};

export default extension;
