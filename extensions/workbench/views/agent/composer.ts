import { div, dynamicChild, icon, show, span, textarea } from "@vaakx-dev/vrui";
import { CornerUpLeft, RotateCcw, Send, Square } from "lucide";

import type { SandUi } from "sand:api/ui";

import type { WorkbenchController } from "../../controller.ts";
import type { WorkbenchState } from "../../state.ts";
import { generationControl } from "../generation.ts";
import { contextButton } from "./context.ts";
import { styled } from "sand:api/ui";

const Composer = styled(div, {
  padding: "var(--space-large) max(var(--space-section), calc((100% - var(--content-width)) / 2)) var(--space-section)",
  background: "var(--background)",
  "&[data-centered=true]": { width: "100%", padding: 0 },
});
const ComposerBox = styled(div, {
  position: "relative",
  overflow: "visible",
  border: "1px solid var(--border)",
  borderRadius: "var(--dialog-radius)",
  background: "var(--panel)",
  boxShadow: "0 10px 30px #0003",
});
const Prompt = styled(textarea, {
  width: "100%",
  minHeight: 80,
  maxHeight: 208,
  padding: "var(--space-large) var(--space-section) var(--space-medium)",
  resize: "none",
  border: 0,
  outline: 0,
  background: "transparent",
  lineHeight: "var(--line-body)",
});
const Actions = styled(div, {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--space-small)",
});
const RunActions = styled(div, { flex: "0 0 auto", display: "flex", alignItems: "center", gap: "var(--space-small)" });
const Queue = styled(div, {
  minWidth: 0,
  height: "var(--control-large)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-medium)",
  margin: "var(--space-medium) var(--space-medium) 0",
  padding: "0 var(--space-medium)",
  borderRadius: "var(--row-radius)",
  color: "var(--muted)",
  background: "var(--elevated)",
  fontSize: "var(--font-caption)",
  "> span:first-child": { flex: "0 0 auto", color: "var(--text)", fontWeight: "var(--weight-semibold)" },
});
const QueuePrompt = styled(span, { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });

export function composer(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: SandUi,
  centered = false,
): HTMLElement {
  return Composer(
    { "data-centered": centered },
    ComposerBox(
      {},
      queueStatus(state),
      Prompt({
        bindValue: state.threads.prompt,
        placeholder: "Ask anything, @tag files/folders, $use skills, or / for commands",
        onKeyDown: (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void controller.runs.send();
          }
        },
      }),
      Actions(
        {},
        generationControl(
          controller,
          state,
          controls,
          {
            provider: state.provider,
            model: state.model,
            reasoning: state.reasoning,
            serviceTier: state.serviceTier,
            selectModel: (provider, model) => controller.selection.select(provider, model),
            selectReasoning: (value) => {
              state.reasoning.set(value);
              return controller.selection.saveOptions();
            },
            selectServiceTier: (value) => {
              state.serviceTier.set(value);
              return controller.selection.saveOptions();
            },
          },
          {
            modelOpen: state.modelPickerOpen,
            traitsOpen: state.traitsOpen,
            query: state.modelQuery,
            index: state.modelIndex,
            source: state.modelSource,
          },
          () => state.threads.contextOpen.set(false),
        ),
        runActions(controller, state, controls),
      ),
    ),
  );
}

function queueStatus(state: WorkbenchState): HTMLElement {
  return show(state.threads.queue.map((turns) => turns.length > 0), () => Queue(
    {},
    span(state.threads.queue.map((turns) => `${turns.length} queued`)),
    QueuePrompt(
      {},
      state.threads.queue.map((turns) => turns[0]?.prompt ?? ""),
    ),
  ));
}

function runActions(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: SandUi,
): HTMLElement {
  return dynamicChild(state.threads.status, (status) => {
    if (status === "running") {
      return RunActions(
        {},
        controls.button(
          {
            variant: "ghost",
            size: "compact",
            disabled: state.threads.prompt.map((value) => !value.trim()),
            onClick: () => void controller.runs.steer(),
          },
          icon(CornerUpLeft, controls.tokens.size.iconCompact),
          "Steer",
        ),
        contextButton(state, controls),
        sendButton(controller, state, controls, "Queue prompt"),
        controls.iconButton({
          label: "Stop",
          variant: "round",
          renderIcon: (size) => icon(Square, size),
          onClick: () => void controller.runs.cancel(),
        }),
      );
    }
    if (status === "interrupted") {
      return RunActions(
        {},
        controls.button(
          {
            variant: "ghost",
            size: "compact",
            onClick: () => void controller.runs.recover(),
          },
          icon(RotateCcw, controls.tokens.size.iconCompact),
          "Recover",
        ),
        contextButton(state, controls),
        sendButton(controller, state, controls),
      );
    }
    return RunActions(
      {},
      contextButton(state, controls),
      sendButton(controller, state, controls),
    );
  });
}

function sendButton(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: SandUi,
  label = "Send",
): HTMLElement {
  return controls.iconButton({
    label,
    variant: "round",
    disabled: state.threads.prompt.map((value) => !value.trim()),
    renderIcon: (size) => icon(Send, size),
    onClick: () => void controller.runs.send(),
  });
}
