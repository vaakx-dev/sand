import { button, div, dynamicChild, icon, input, onRaf, span, stop } from "@vaakx-dev/vrui";
import { ArrowLeft, FolderPlus, GitBranch, Link } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { modalFooter } from "./shared.ts";

interface SourceOption {
  icon: Parameters<typeof icon>[0];
  title: string;
  detail: string;
  action: () => void;
}

export function projectSource(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "overlay project-overlay", onClick: state.projectSourceOpen.setter(false) },
    dynamicChild(state.projectSourceView, (view) => view === "git"
      ? gitSource(controller, state)
      : sources(controller, state)),
  );
}

function sources(controller: WorkbenchController, state: WorkbenchState): HTMLElement {
  const options: SourceOption[] = [
    {
      icon: FolderPlus,
      title: "Local folder",
      detail: "Browse a folder on disk",
      action: () => void controller.projects.chooseLocal(),
    },
    {
      icon: Link,
      title: "Git URL",
      detail: "Clone from a remote URL",
      action: () => state.projectSourceView.set("git"),
    },
    {
      icon: GitBranch,
      title: "GitHub repository",
      detail: "Clone GitHub owner/repo",
      action: () => state.projectSourceView.set("git"),
    },
  ];
  const move = (amount: number) => state.projectSourceIndex.set(Math.min(
    options.length - 1,
    Math.max(0, state.projectSourceIndex.get() + amount),
  ));

  return div(
    {
      class: "project-modal source-modal",
      onClick: stop,
      tabIndex: 0,
      onMount: (element) => onRaf(() => element.focus()),
      onKeyDown: (event) => sourceKeyDown(event, state, options, move),
    },
    div(
      { class: "project-search" },
      button(
        { class: "project-back", "aria-label": "Close", onClick: state.projectSourceOpen.setter(false) },
        icon(ArrowLeft, 15),
      ),
      span({ class: "source-search-label" }, "Add a project"),
    ),
    span({ class: "project-section-label" }, "Sources"),
    div(
      { class: "project-list source-list" },
      ...options.map((option, index) => sourceRow(
        option,
        state.projectSourceIndex.map((value) => value === index),
        () => state.projectSourceIndex.set(index),
      )),
    ),
    modalFooter(),
  );
}

function sourceRow(
  option: SourceOption,
  selected: ReturnType<WorkbenchState["project_sourceIndex"]["map"]>,
  select: () => void,
): HTMLElement {
  return button(
    {
      class: ["source-row", { active: selected }],
      onClick: option.action,
      onMouseEnter: select,
    },
    icon(option.icon, 17),
    div(
      { class: "source-copy" },
      span({ class: "source-name" }, option.title),
      span({ class: "source-detail" }, option.detail),
    ),
  );
}

function sourceKeyDown(
  event: KeyboardEvent,
  state: WorkbenchState,
  options: SourceOption[],
  move: (amount: number) => void,
): void {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    move(event.key === "ArrowDown" ? 1 : -1);
  }
  if (event.key === "Enter") options[state.projectSourceIndex.get()]?.action();
  if (event.key === "Escape" || event.key === "Backspace") {
    event.preventDefault();
    state.projectSourceOpen.set(false);
  }
}

function gitSource(controller: WorkbenchController, state: WorkbenchState): HTMLElement {
  return div(
    { class: "project-modal git-source-modal", onClick: stop },
    div(
      { class: "project-search" },
      button(
        { class: "project-back", "aria-label": "Back", onClick: state.projectSourceView.setter("sources") },
        icon(ArrowLeft, 15),
      ),
      span({ class: "source-search-label" }, "Clone a repository"),
    ),
    div(
      { class: "git-source-form" },
      span({ class: "project-section-label" }, "Git URL or GitHub owner/repo"),
      input({
        class: "git-source-input",
        bindValue: state.projectCloneUrl,
        placeholder: "https://github.com/owner/repository.git",
        onMount: (element) => onRaf(() => element.focus()),
        onKeyDown: (event) => gitKeyDown(event, controller, state),
      }),
      span(
        { class: "git-source-help" },
        "Sand will ask for a parent folder, clone there, then reopen on the new workspace.",
      ),
      button(
        {
          class: "primary-button clone-button",
          disabled: state.projectCloneUrl.map((value) => !value.trim()),
          onClick: () => void controller.projects.clone(),
        },
        "Choose destination and clone",
      ),
    ),
    modalFooter(),
  );
}

function gitKeyDown(
  event: KeyboardEvent,
  controller: WorkbenchController,
  state: WorkbenchState,
): void {
  if (event.key === "Enter") void controller.projects.clone();
  if (event.key === "Escape") state.projectSourceView.set("sources");
  if (event.key === "Backspace" && !state.projectCloneUrl.get()) {
    event.preventDefault();
    state.projectSourceView.set("sources");
  }
}
