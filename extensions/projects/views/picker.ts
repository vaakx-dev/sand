import { derive, dynamicChild, icon, onRaf } from "@vaakx-dev/vrui";
import { ArrowLeft, FolderOpen } from "lucide";

import type { SandUi } from "sand:api/ui";
import type { ProjectsController } from "../controller.ts";
import type { ProjectsState } from "../state.ts";
import { modalFooter } from "./shared.ts";

export function projectPicker(
  controller: ProjectsController,
  state: ProjectsState,
  ui: SandUi,
): HTMLElement {
  const filtered = derive(() => {
    const query = state.query.get().trim().toLowerCase();
    return state.items.get().filter((project) =>
      !query || `${project.name} ${project.path}`.toLowerCase().includes(query)
    );
  });
  const open = (index: number) => {
    const project = filtered.get()[index];
    if (project) void controller.select(project.path);
  };
  const move = (amount: number) => {
    const last = Math.max(0, filtered.get().length - 1);
    state.index.set(Math.min(last, Math.max(0, state.index.get() + amount)));
  };
  return ui.modal(
    { label: "Projects", onDismiss: state.pickerOpen.setter(false) },
    ui.modalHeader({
      leading: ui.iconButton({
        label: "Close",
        variant: "dense",
        renderIcon: (size) => icon(ArrowLeft, size),
        onClick: state.pickerOpen.setter(false),
      }),
      content: ui.searchField({
        value: state.query,
        label: "Search projects",
        placeholder: "Search...",
        onInput: () => state.index.set(0),
        onMount: (element) => onRaf(() => element.focus()),
        onKeyDown: (event) => pickerKeyDown(event, state, move, open),
      }),
    }),
    dynamicChild(filtered, (projects) => ui.modalBody(
      { variant: "list" },
      ...projects.map((project, index) => ui.listItem({
        label: project.name,
        description: project.path,
        detail: index < 9 ? `Ctrl+${index + 1}` : undefined,
        selected: state.index.map((value) => value === index),
        renderIcon: (size) => icon(FolderOpen, size),
        onClick: () => void controller.select(project.path),
      })),
      projects.length === 0 ? ui.emptyState({ title: "No matching projects" }) : null,
    )),
    modalFooter(ui),
  );
}

function pickerKeyDown(
  event: KeyboardEvent,
  state: ProjectsState,
  move: (amount: number) => void,
  open: (index: number) => void,
): void {
  if (event.key === "Escape") state.pickerOpen.set(false);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    move(event.key === "ArrowDown" ? 1 : -1);
  }
  if (event.key === "Enter") open(state.index.get());
  if (event.key === "Backspace" && !state.query.get()) {
    event.preventDefault();
    state.pickerOpen.set(false);
  }
  if ((event.ctrlKey || event.metaKey) && /^[1-9]$/u.test(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    open(Number(event.key) - 1);
  }
}
