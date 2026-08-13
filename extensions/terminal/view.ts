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

import type { TerminalController } from "./controller.ts";
import type { TerminalPane } from "./models.ts";
import type { TerminalState } from "./state.ts";
import type { SandUi } from "sand:api/ui";
import { styled, tokens } from "sand:api/ui";

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 640;

const Drawer = styled(div, {
  position: "relative",
  minHeight: MIN_HEIGHT,
  borderTop: "1px solid var(--border)",
  background: "var(--background)",
  overflow: "hidden",
});
const Panes = styled(div, {
  width: "100%",
  height: "100%",
  display: "grid",
  "&[data-layout=columns] > div + div": { borderLeft: "1px solid var(--border)" },
  "&[data-layout=rows] > div + div": { borderTop: "1px solid var(--border)" },
});
const Pane = styled(div, { minWidth: 0, minHeight: 0, overflow: "hidden", background: "var(--background)" });
const Screen = styled(div, {
  width: "100%",
  height: "100%",
  padding: "var(--space-large) var(--space-section)",
  overflow: "auto",
  color: "var(--text)",
  font: "var(--font-label)/1.5 var(--mono)",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
});
const Actions = styled(div, {
  position: "absolute",
  zIndex: "var(--z-chrome)",
  top: "var(--space-medium)",
  right: "var(--space-large)",
  height: "var(--control-compact)",
  display: "flex",
  alignItems: "center",
  padding: "0 var(--space-compact)",
  border: "1px solid var(--border)",
  borderRadius: "var(--control-radius)",
  background: "var(--background)",
});
const ErrorNotice = styled(div, {
  position: "absolute",
  zIndex: "var(--z-chrome)",
  left: "var(--space-large)",
  bottom: "var(--space-medium)",
  color: "var(--danger)",
  fontSize: "var(--font-caption)",
});
const CommandRow = styled(div, { minWidth: 0, display: "flex", alignItems: "baseline", color: "var(--text)", fontWeight: "var(--weight-semibold)" });
const Prompt = styled(span, { flex: "0 0 auto", whiteSpace: "pre" });
const TerminalInput = styled(input, {
  minWidth: "2ch",
  height: "var(--control-tiny)",
  flex: "1 1 auto",
  padding: 0,
  border: 0,
  borderRadius: 0,
  outline: 0,
  appearance: "none",
  color: "var(--text)",
  background: "transparent",
  boxShadow: "none",
  font: "inherit",
  fontWeight: "var(--weight-semibold)",
  caretColor: "var(--text)",
});
const Line = styled(span, {
  display: "inline",
  whiteSpace: "pre-wrap",
  "&[data-stream=stderr]": { color: "var(--danger)" },
  "&[data-stream=command]": { color: "var(--text)", fontWeight: "var(--weight-semibold)" },
  "&[data-stream=status]": { color: "var(--muted)" },
});
const Stream = styled(span, { display: "inline", whiteSpace: "pre-wrap" });
const ResizeGrip = styled(div, {
  position: "absolute",
  zIndex: "var(--z-resizer)",
  inset: `-${tokens.space.small}px 0 auto`,
  height: tokens.space.medium,
  cursor: "row-resize",
});

export function terminalView(
  controller: TerminalController,
  state: TerminalState,
  controls: SandUi,
): HTMLElement {
  const columns = derive(() => state.layout.get() === "columns"
    ? `repeat(${Math.max(1, state.panes.get().length)}, minmax(0, 1fr))`
    : "minmax(0, 1fr)"
  );
  const rows = derive(() => state.layout.get() === "rows"
    ? `repeat(${Math.max(1, state.panes.get().length)}, minmax(0, 1fr))`
    : "minmax(0, 1fr)"
  );
  return Drawer(
    {
      hidden: state.visible.map((visible) => !visible),
      style: { height: state.height.map((height) => `${height}px`) },
    },
    resizeGrip(controller, state),
    terminalActions(controller, state, controls),
    show(state.error.map(Boolean), () => ErrorNotice({}, state.error)),
    list(
      state.panes,
      (pane) => pane.id,
      (pane) => terminalPane(controller, state, pane.get()),
      Panes({
        "data-layout": state.layout,
        style: { gridTemplateColumns: columns, gridTemplateRows: rows },
      }),
    ),
  );
}

function terminalActions(
  controller: TerminalController,
  state: TerminalState,
  controls: SandUi,
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
  return Actions(
    {},
    ...actions.map((action) => controls.iconButton({
      label: action.label,
      variant: "compact",
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
  return Pane(
    {
      onPointerDown: () => state.activeId.set(pane.id),
    },
    Screen(
      {
        onMount: (element) => effect(() => {
          terminalLines.get();
          return onRaf(() => { element.scrollTop = element.scrollHeight; });
        }),
      },
      list(
        lines,
        (line) => line.id,
        (line) => Line({ "data-stream": line.prop("stream") }, line.prop("text")),
        Stream({}),
      ),
      show(ready, () => CommandRow(
        {},
        Prompt({}, prompt),
        TerminalInput({
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
  return ResizeGrip({
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
