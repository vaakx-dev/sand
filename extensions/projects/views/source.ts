import { button, div, dynamicChild, icon, input, onRaf, span, stop } from "@vaakx-dev/vrui";
import { ArrowLeft, FolderPlus, GitBranch, Link } from "lucide";

import type { UiControls } from "@sand/extension-api";

import type { ProjectsController } from "../controller.ts";
import type { ProjectsState } from "../state.ts";
import { modalFooter } from "./shared.ts";

interface SourceOption {
  icon: Parameters<typeof icon>[0];
  title: string;
  detail: string;
  action: () => void;
}

export function projectSource(
  controller: ProjectsController,
  state: ProjectsState,
  controls: UiControls,
): HTMLElement {
  return div(
    { class: "overlay project-overlay", onClick: state.sourceOpen.setter(false) },
    dynamicChild(state.sourceView, (view) => view === "git"
      ? gitSource(controller, state, controls)
      : sources(controller, state, controls)),
  );
}

function sources(
  controller: ProjectsController,
  state: ProjectsState,
  controls: UiControls,
): HTMLElement {
  const options: SourceOption[] = [
    {
      icon: FolderPlus,
      title: "Local folder",
      detail: "Browse a folder on disk",
      action: () => void controller.chooseLocal(),
    },
    {
      icon: Link,
      title: "Git URL",
      detail: "Clone from a remote URL",
      action: () => state.sourceView.set("git"),
    },
    {
      icon: GitBranch,
      title: "GitHub repository",
      detail: "Clone GitHub owner/repo",
      action: () => state.sourceView.set("git"),
    },
  ];
  const move = (amount: number) => state.sourceIndex.set(Math.min(
    options.length - 1,
    Math.max(0, state.sourceIndex.get() + amount),
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
      controls.iconButton({
        label: "Close",
        variant: "dense",
        className: "project-back",
        tooltip: false,
        renderIcon: (size) => icon(ArrowLeft, size),
        onClick: state.sourceOpen.setter(false),
      }),
      span({ class: "source-search-label" }, "Add a project"),
    ),
    span({ class: "project-section-label" }, "Sources"),
    div(
      { class: "project-list source-list" },
      ...options.map((option, index) => sourceRow(
        option,
        state.sourceIndex.map((value) => value === index),
        () => state.sourceIndex.set(index),
      )),
    ),
    modalFooter(),
  );
}

function sourceRow(
  option: SourceOption,
  selected: ReturnType<ProjectsState["sourceIndex"]["map"]>,
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
  state: ProjectsState,
  options: SourceOption[],
  move: (amount: number) => void,
): void {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    move(event.key === "ArrowDown" ? 1 : -1);
  }
  if (event.key === "Enter") options[state.sourceIndex.get()]?.action();
  if (event.key === "Escape" || event.key === "Backspace") {
    event.preventDefault();
    state.sourceOpen.set(false);
  }
}

function gitSource(
  controller: ProjectsController,
  state: ProjectsState,
  controls: UiControls,
): HTMLElement {
  return div(
    { class: "project-modal git-source-modal", onClick: stop },
    div(
      { class: "project-search" },
      controls.iconButton({
        label: "Back",
        variant: "dense",
        className: "project-back",
        tooltip: false,
        renderIcon: (size) => icon(ArrowLeft, size),
        onClick: state.sourceView.setter("sources"),
      }),
      span({ class: "source-search-label" }, "Clone a repository"),
    ),
    div(
      { class: "git-source-form" },
      span({ class: "project-section-label" }, "Git URL or GitHub owner/repo"),
      input({
        class: "git-source-input",
        bindValue: state.cloneUrl,
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
          disabled: state.cloneUrl.map((value) => !value.trim()),
          onClick: () => void controller.clone(),
        },
        "Choose destination and clone",
      ),
    ),
    modalFooter(),
  );
}

function gitKeyDown(
  event: KeyboardEvent,
  controller: ProjectsController,
  state: ProjectsState,
): void {
  if (event.key === "Enter") void controller.clone();
  if (event.key === "Escape") state.sourceView.set("sources");
  if (event.key === "Backspace" && !state.cloneUrl.get()) {
    event.preventDefault();
    state.sourceView.set("sources");
  }
}
