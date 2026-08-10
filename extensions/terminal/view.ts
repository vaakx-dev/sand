import {
  derive,
  div,
  effect,
  icon,
  input,
  list,
  onRaf,
  onWindow,
  show,
  span,
} from "@vaakx-dev/vrui";
import type { IconNode, MaybeReactive } from "@vaakx-dev/vrui";
import { Plus, SquareSplitHorizontal, SquareSplitVertical, Trash2 } from "lucide";

import type { UiControls } from "@sand/extension-api";

import type { TerminalController } from "./controller.ts";
import type { TerminalPane } from "./models.ts";
import type { TerminalState } from "./state.ts";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 620;

export function terminalView(
  controller: TerminalController,
  state: TerminalState,
  controls: UiControls,
): HTMLElement {
  const columns = derive(() => state.layout.get() === "columns"
    ? `repeat(${Math.max(1, state.panes.get().length)}, minmax(0, 1fr))`
    : "minmax(0, 1fr)"
  );
  const rows = derive(() => state.layout.get() === "rows"
    ? `repeat(${Math.max(1, state.panes.get().length)}, minmax(0, 1fr))`
    : "minmax(0, 1fr)"
  );
  return div(
    {
      class: "terminal-drawer",
      hidden: state.visible.map((visible) => !visible),
      style: { height: state.height.map((height) => `${height}px`) },
    },
    resizeGrip(controller, state),
    terminalActions(controller, state, controls),
    show(state.error.map(Boolean), () => div({ class: "terminal-error" }, state.error)),
    list(
      state.panes,
      (pane) => pane.id,
      (pane) => terminalPane(controller, state, pane.get()),
      div({
        class: ["terminal-panes", {
          columns: state.layout.map((layout) => layout === "columns"),
          rows: state.layout.map((layout) => layout === "rows"),
        }],
        style: { gridTemplateColumns: columns, gridTemplateRows: rows },
      }),
    ),
  );
}

function terminalActions(
  controller: TerminalController,
  state: TerminalState,
  controls: UiControls,
): HTMLElement {
  const actions: Array<{
    label: string;
    icon: IconNode;
    run: () => void;
    disabled?: MaybeReactive<boolean>;
  }> = [
    {
      label: "Split Terminal Vertically (Ctrl+Shift+D)",
      icon: SquareSplitVertical,
      run: () => void controller.create("columns"),
    },
    {
      label: "Split Terminal Horizontally",
      icon: SquareSplitHorizontal,
      run: () => void controller.create("rows"),
    },
    {
      label: "New Terminal (Ctrl+N)",
      icon: Plus,
      run: () => void controller.create(),
    },
    {
      label: "Close Terminal",
      icon: Trash2,
      run: () => {
        const id = state.activeId.get();
        if (id) void controller.close(id);
      },
      disabled: state.activeId.map((id) => !id),
    },
  ];
  return div(
    { class: "terminal-actions" },
    ...actions.map((action) => controls.iconButton({
      label: action.label,
      variant: "compact",
      className: "terminal-action",
      disabled: action.disabled,
      renderIcon: (size) => icon(action.icon, size),
      onClick: action.run,
    })),
  );
}

function terminalPane(
  controller: TerminalController,
  state: TerminalState,
  pane: TerminalPane,
): HTMLElement {
  const terminalLines = derive(() => state.lines.get().filter((line) => line.terminalId === pane.id));
  const lines = derive(() => terminalLines.get().filter((line) => line.stream !== "prompt"));
  const prompt = derive(() => terminalLines.get().findLast((line) => line.stream === "prompt")?.text ?? "");
  const running = derive(() => state.panes.get().find((item) => item.id === pane.id)?.status === "running");
  const ready = derive(() => running.get() && (state.ready.get()[pane.id] ?? false));
  const command = {
    get: () => state.commands.get()[pane.id] ?? "",
    set: (value: string) => state.commands.update((commands) => ({ ...commands, [pane.id]: value })),
  };
  return div(
    {
      class: ["terminal-pane", { active: state.activeId.map((id) => id === pane.id) }],
      onPointerDown: () => state.activeId.set(pane.id),
    },
    div(
      {
        class: "terminal-screen",
        onMount: (element) => effect(() => {
          terminalLines.get();
          return onRaf(() => { element.scrollTop = element.scrollHeight; });
        }),
      },
      list(
        lines,
        (line) => line.id,
        (line) => span({ class: ["terminal-line", line.prop("stream")] }, line.prop("text")),
        span({ class: "terminal-stream" }),
      ),
      show(ready, () => div(
        { class: "terminal-command-row" },
        span({ class: "terminal-prompt" }, prompt),
        input({
          class: "terminal-input",
          bindValue: command,
          spellcheck: false,
          autocomplete: "off",
          "aria-label": "Terminal input",
          onMount: (element) => effect(() => {
            if (state.activeId.get() === pane.id && ready.get()) return onRaf(() => element.focus());
          }),
          onFocus: () => state.activeId.set(pane.id),
          onKeyDown: (event) => terminalKeyDown(event, controller, pane.id),
        }),
      )),
    ),
  );
}

function terminalKeyDown(event: KeyboardEvent, controller: TerminalController, paneId: string): void {
  const modifier = event.ctrlKey || event.metaKey;
  if (event.key === "Enter") {
    event.preventDefault();
    void controller.write(paneId);
  } else if (modifier && event.shiftKey && event.key.toLowerCase() === "d") {
    event.preventDefault();
    void controller.create("columns");
  } else if (modifier && !event.shiftKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    event.stopPropagation();
    void controller.create();
  }
}

function resizeGrip(controller: TerminalController, state: TerminalState): HTMLElement {
  let dragging = false;
  let startY = 0;
  let startHeight = 0;
  return div({
    class: "terminal-resize-grip",
    onPointerDown: (event) => {
      if (event.button !== 0) return;
      dragging = true;
      startY = event.clientY;
      startHeight = state.height.get();
      document.body.classList.add("resizing-terminal");
      event.preventDefault();
    },
    onMount: (element) => {
      const move = onWindow(element, "pointermove", (raw) => {
        if (!dragging) return;
        const event = raw as PointerEvent;
        state.height.set(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + startY - event.clientY)));
      });
      const end = onWindow(element, "pointerup", () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove("resizing-terminal");
        controller.saveHeight();
      });
      return () => {
        dragging = false;
        document.body.classList.remove("resizing-terminal");
        move();
        end();
      };
    },
  });
}
