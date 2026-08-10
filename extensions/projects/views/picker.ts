import { button, derive, div, dynamicChild, icon, input, onRaf, span, stop } from "@vaakx-dev/vrui";
import { ArrowLeft, FolderOpen, Search } from "lucide";

import type { UiControls } from "@sand/extension-api";

import type { ProjectsController } from "../controller.ts";
import { samePath } from "../controller.ts";
import type { ProjectsState } from "../state.ts";
import { modalFooter } from "./shared.ts";

export function projectPicker(
  controller: ProjectsController,
  state: ProjectsState,
  controls: UiControls,
): HTMLElement {
  const filtered = derive(() => {
    const query = state.query.get().trim().toLowerCase();
    return state.items.get().filter((project) =>
      !query || `${project.name} ${project.path}`.toLowerCase().includes(query)
    );
  });
  const openIndex = (index: number) => {
    const project = filtered.get()[index];
    if (project) void controller.select(project.path);
  };
  const move = (amount: number) => {
    const last = Math.max(0, filtered.get().length - 1);
    state.index.set(Math.min(last, Math.max(0, state.index.get() + amount)));
  };

  return div(
    { class: "overlay project-overlay", onClick: state.pickerOpen.setter(false) },
    div(
      { class: "project-modal", onClick: stop },
      div(
        { class: "project-search" },
        controls.iconButton({
          label: "Close",
          variant: "dense",
          className: "project-back",
          tooltip: false,
          renderIcon: (size) => icon(ArrowLeft, size),
          onClick: state.pickerOpen.setter(false),
        }),
        icon(Search, 14),
        input({
          bindValue: state.query,
          placeholder: "Search...",
          onMount: (element) => onRaf(() => element.focus()),
          onInput: () => state.index.set(0),
          onKeyDown: (event) => pickerKeyDown(event, state, move, openIndex),
        }),
      ),
      span({ class: "project-section-label" }, "Projects"),
      dynamicChild(filtered, (projects) => div(
        { class: "project-list" },
        ...projects.map((project, index) => button(
          {
            class: ["project-row", {
              active: state.index.map((value) => value === index),
              current: state.root.map((root) => samePath(root, project.path)),
            }],
            "aria-selected": state.index.map((value) => value === index),
            onMouseEnter: () => state.index.set(index),
            onClick: () => void controller.select(project.path),
          },
          icon(FolderOpen, 16),
          div(
            { class: "project-row-copy" },
            span({ class: "project-row-name" }, project.name),
            span({ class: "project-row-path" }, project.path),
          ),
          index < 9 ? span({ class: "project-shortcut" }, `Ctrl+${index + 1}`) : null,
        )),
        projects.length === 0 ? div({ class: "project-empty" }, "No matching projects") : null,
      )),
      modalFooter(),
    ),
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
