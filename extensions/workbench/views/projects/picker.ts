import { button, derive, div, dynamicChild, icon, input, onRaf, span, stop } from "@vaakx-dev/vrui";
import { ArrowLeft, FolderOpen, Search } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { modalFooter } from "./shared.ts";

export function projectPicker(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const filtered = derive(() => {
    const query = state.projectQuery.get().trim().toLowerCase();
    return state.projects.get().filter((project) =>
      !query || `${project.name} ${project.path}`.toLowerCase().includes(query)
    );
  });
  const openIndex = (index: number) => {
    const project = filtered.get()[index];
    if (project) void controller.projects.select(project.path);
  };
  const move = (amount: number) => {
    const last = Math.max(0, filtered.get().length - 1);
    state.projectIndex.set(Math.min(last, Math.max(0, state.projectIndex.get() + amount)));
  };

  return div(
    { class: "overlay project-overlay", onClick: state.projectPickerOpen.setter(false) },
    div(
      { class: "project-modal", onClick: stop },
      div(
        { class: "project-search" },
        button(
          { class: "project-back", "aria-label": "Close", onClick: state.projectPickerOpen.setter(false) },
          icon(ArrowLeft, 15),
        ),
        icon(Search, 14),
        input({
          bindValue: state.projectQuery,
          placeholder: "Search...",
          onMount: (element) => onRaf(() => element.focus()),
          onInput: () => state.projectIndex.set(0),
          onKeyDown: (event) => pickerKeyDown(event, state, move, openIndex),
        }),
      ),
      span({ class: "project-section-label" }, "Projects"),
      dynamicChild(filtered, (projects) => div(
        { class: "project-list" },
        ...projects.map((project, index) => button(
          {
            class: ["project-row", {
              active: state.projectIndex.map((value) => value === index),
              current: state.root.map((root) => samePath(root, project.path)),
            }],
            "aria-selected": state.projectIndex.map((value) => value === index),
            onMouseEnter: () => state.projectIndex.set(index),
            onClick: () => void controller.projects.select(project.path),
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
  state: WorkbenchState,
  move: (amount: number) => void,
  open: (index: number) => void,
): void {
  if (event.key === "Escape") state.projectPickerOpen.set(false);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    move(event.key === "ArrowDown" ? 1 : -1);
  }
  if (event.key === "Enter") open(state.projectIndex.get());
  if (event.key === "Backspace" && !state.projectQuery.get()) {
    event.preventDefault();
    state.projectPickerOpen.set(false);
  }
  if ((event.ctrlKey || event.metaKey) && /^[1-9]$/u.test(event.key)) {
    event.preventDefault();
    event.stopPropagation();
    open(Number(event.key) - 1);
  }
}

function samePath(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: "accent" }) === 0;
}
