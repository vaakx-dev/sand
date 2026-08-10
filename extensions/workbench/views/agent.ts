import { button, derive, div, dynamicChild, icon, show, span, textarea } from "@vaakx-dev/vrui";
import { ChevronDown, Send, Square } from "lucide";

import type { WorkbenchController } from "../controller.ts";
import type { WorkbenchState } from "../state.ts";
import { conversationView } from "./agent/conversation.ts";
import { openaiIcon } from "./agent/icons.ts";
import { reasoningLabel } from "./agent/labels.ts";
import { modelPicker } from "./agent/modelPicker.ts";
import { traitsPicker } from "./agent/traitsPicker.ts";
import { projectName } from "./format.ts";

export function agentPanel(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return dynamicChild(
    derive(() => state.messages.get().length > 0 || Boolean(state.agentDelta.get())),
    (hasMessages) => hasMessages
      ? div(
          { class: "agent-panel" },
          conversationView(state),
          composer(controller, state, false),
        )
      : newThread(controller, state),
  );
}

function newThread(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  return div(
    { class: "agent-panel new-thread" },
    div(
      { class: "new-thread-center" },
      div(
        { class: "new-thread-heading" },
        "What should we build in ",
        span(state.root.map(projectName)),
        "?",
      ),
      composer(controller, state, true),
    ),
  );
}

function composer(
  controller: WorkbenchController,
  state: WorkbenchState,
  centered: boolean,
): HTMLElement {
  const running = state.agentStatus.map((status) => status === "running");
  return div(
    { class: ["composer", { centered }] },
    div(
      { class: "composer-box" },
      textarea({
        class: "prompt-input",
        bindValue: state.prompt,
        placeholder: "Ask anything, @tag files/folders, $use skills, or / for commands",
        onKeyDown: (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void controller.agent.sendPrompt();
          }
        },
      }),
      div(
        { class: "composer-actions" },
        div(
          { class: "composer-tools" },
          button(
            {
              class: ["composer-chip", "model-trigger", { active: state.modelPickerOpen }],
              "data-tooltip": "Choose model",
              onClick: () => {
                state.traitsOpen.set(false);
                state.modelIndex.set(0);
                state.modelPickerOpen.toggle()();
              },
            },
            openaiIcon(14),
            span({ class: "composer-model-label" }, state.model),
            icon(ChevronDown, 11),
          ),
          button(
            {
              class: ["composer-chip", { active: state.traitsOpen }],
              "data-tooltip": "Reasoning and service tier",
              onClick: () => {
                state.modelPickerOpen.set(false);
                state.traitsOpen.toggle()();
              },
            },
            state.reasoning.map(reasoningLabel),
            " · ",
            state.serviceTier.map((value) => value === "fast" ? "Fast" : "Standard"),
            icon(ChevronDown, 11),
          ),
        ),
        dynamicChild(running, (isRunning) => isRunning
          ? button(
              {
                class: "send-button stop",
                "aria-label": "Stop",
                "data-tooltip": "Stop",
                onClick: () => void controller.agent.cancel(),
              },
              icon(Square, 13),
            )
          : button(
              {
                class: "send-button",
                "aria-label": "Send",
                "data-tooltip": "Send",
                disabled: state.prompt.map((value) => !value.trim()),
                onClick: () => void controller.agent.sendPrompt(),
              },
              icon(Send, 14),
            )),
      ),
      show(state.modelPickerOpen, () => modelPicker(controller, state)),
      show(state.traitsOpen, () => traitsPicker(controller, state)),
    ),
  );
}
