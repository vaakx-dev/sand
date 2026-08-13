import { dynamicChild, icon, onRaf, span } from "@vaakx-dev/vrui";
import { ArrowLeft, FolderPlus, GitBranch, Link } from "lucide";

import type { SandUi } from "sand:api/ui";
import { styled } from "sand:api/ui";
import type { ProjectsController } from "../controller.ts";
import type { ProjectsState } from "../state.ts";
import { modalFooter } from "./shared.ts";

interface SourceOption {
  icon: Parameters<typeof icon>[0];
  title: string;
  detail: string;
  action: () => void;
}

const Help = styled(span, {
  display: "block",
  color: "var(--muted)",
  fontSize: "var(--font-caption)",
  lineHeight: "var(--line-body)",
});

export function projectSource(
  controller: ProjectsController,
  state: ProjectsState,
  ui: SandUi,
): HTMLElement {
  return dynamicChild(state.sourceView, (view) => view === "git"
    ? gitSource(controller, state, ui)
    : sources(controller, state, ui));
}

function sources(
  controller: ProjectsController,
  state: ProjectsState,
  ui: SandUi,
): HTMLElement {
  const options: SourceOption[] = [
    { icon: FolderPlus, title: "Local folder", detail: "Browse a folder on disk", action: () => void controller.chooseLocal() },
    { icon: Link, title: "Git URL", detail: "Clone from a remote URL", action: () => state.sourceView.set("git") },
    { icon: GitBranch, title: "GitHub repository", detail: "Clone GitHub owner/repo", action: () => state.sourceView.set("git") },
  ];
  const move = (amount: number) => state.sourceIndex.set(Math.min(
    options.length - 1,
    Math.max(0, state.sourceIndex.get() + amount),
  ));
  return ui.modal(
    { label: "Add a project", onDismiss: state.sourceOpen.setter(false) },
    ui.modalHeader({
      title: "Add a project",
      leading: ui.iconButton({
        label: "Close",
        variant: "dense",
        renderIcon: (size) => icon(ArrowLeft, size),
        onClick: state.sourceOpen.setter(false),
      }),
    }),
    ui.modalBody(
      {
        variant: "list",
        tabIndex: 0,
        onMount: (element) => onRaf(() => element.focus()),
        onKeyDown: (event) => sourceKeyDown(event, state, options, move),
      },
      ...options.map((option, index) => ui.listItem({
        label: option.title,
        description: option.detail,
        selected: state.sourceIndex.map((value) => value === index),
        renderIcon: (size) => icon(option.icon, size),
        onClick: option.action,
      })),
    ),
    modalFooter(ui),
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
  ui: SandUi,
): HTMLElement {
  return ui.modal(
    { label: "Clone a repository", onDismiss: state.sourceOpen.setter(false) },
    ui.modalHeader({
      title: "Clone a repository",
      leading: ui.iconButton({
        label: "Back",
        variant: "dense",
        renderIcon: (size) => icon(ArrowLeft, size),
        onClick: state.sourceView.setter("sources"),
      }),
    }),
    ui.modalBody(
      {},
      ui.textField({
        bindValue: state.cloneUrl,
        placeholder: "https://github.com/owner/repository.git",
        "aria-label": "Git URL or GitHub owner/repo",
        onMount: (element) => onRaf(() => element.focus()),
        onKeyDown: (event) => gitKeyDown(event, controller, state),
      }),
      Help({}, "Sand will ask for a parent folder, clone there, then reopen on the new workspace."),
      ui.modalActions(
        ui.button(
          {
            variant: "primary",
            disabled: state.cloneUrl.map((value) => !value.trim()),
            onClick: () => void controller.clone(),
          },
          "Choose destination and clone",
        ),
      ),
    ),
    modalFooter(ui),
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
