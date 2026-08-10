import { derive, div, effect, input, list, onRaf, show, span } from "@vaakx-dev/vrui";

import type { WorkbenchController } from "../../controller.ts";
import type { TerminalPane } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";

export function terminalPane(
  controller: WorkbenchController,
  state: WorkbenchState,
  pane: TerminalPane,
): HTMLElement {
  const terminalLines = derive(() =>
    state.terminal.get().filter((line) => line.terminalId === pane.id)
  );
  const lines = derive(() => terminalLines.get().filter((line) => line.stream !== "prompt"));
  const prompt = derive(() => terminalLines.get().findLast((line) => line.stream === "prompt")?.text ?? "");
  const running = derive(() =>
    state.terminalPanes.get().find((candidate) => candidate.id === pane.id)?.status === "running"
  );
  const ready = derive(() => running.get() && (state.terminalReady.get()[pane.id] ?? false));
  const command = {
    get: () => state.terminalCommands.get()[pane.id] ?? "",
    set: (value: string) => state.terminalCommands.update((commands) => ({
      ...commands,
      [pane.id]: value,
    })),
  };

  return div(
    {
      class: ["terminal-pane", {
        active: state.terminalActiveId.map((id) => id === pane.id),
      }],
      onPointerDown: () => state.terminalActiveId.set(pane.id),
    },
    div(
      {
        class: "terminal-screen",
        onMount: (element) => effect(() => {
          terminalLines.get();
          return onRaf(() => {
            element.scrollTop = element.scrollHeight;
          });
        }),
      },
      list(
        lines,
        (line) => line.id,
        (line) => span(
          { class: ["terminal-line", line.prop("stream")] },
          line.prop("text"),
        ),
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
            if (state.terminalActiveId.get() === pane.id && ready.get()) {
              return onRaf(() => element.focus());
            }
          }),
          onFocus: () => state.terminalActiveId.set(pane.id),
          onKeyDown: (event) => terminalKeyDown(event, controller, pane.id),
        }),
      )),
    ),
  );
}

function terminalKeyDown(
  event: KeyboardEvent,
  controller: WorkbenchController,
  paneId: string,
): void {
  const modifier = event.ctrlKey || event.metaKey;
  if (event.key === "Enter") {
    event.preventDefault();
    void controller.terminal.write(paneId);
    return;
  }
  if (modifier && event.shiftKey && event.key.toLowerCase() === "d") {
    event.preventDefault();
    void controller.terminal.create("columns");
    return;
  }
  if (modifier && !event.shiftKey && event.key.toLowerCase() === "n") {
    event.preventDefault();
    event.stopPropagation();
    void controller.terminal.create();
  }
}
