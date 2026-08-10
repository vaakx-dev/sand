import { button, derive, div, dynamicChild, icon, show, span, textarea } from "@vaakx-dev/vrui";
import { ChevronDown, Send, Square } from "lucide";

import type { WorkbenchController } from "../controller.ts";
import { findModel, findProvider, modelName, optionLabel } from "../modelCatalog.ts";
import type { WorkbenchState } from "../state.ts";
import { conversationView } from "./agent/conversation.ts";
import { modelPicker } from "./agent/modelPicker.ts";
import { traitsPicker } from "./agent/traitsPicker.ts";
import { projectName } from "./format.ts";
import { providerIcon } from "./shared/providerIcon.ts";

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
  const selectedModel = derive(() => findModel(
    state.providerModels.get(),
    state.provider.get(),
    state.model.get(),
  ));
  const traitsAvailable = selectedModel.map((model) =>
    Boolean(model && (model.reasoning.length > 0 || model.serviceTiers.length > 0))
  );
  const traitsLabel = derive(() => {
    const model = selectedModel.get();
    if (!model) return "";
    return [
      optionLabel(model.reasoning, state.reasoning.get()),
      optionLabel(model.serviceTiers, state.serviceTier.get()),
    ].filter(Boolean).join(" · ");
  });

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
            dynamicChild(state.provider, (provider) => providerIcon(
              findProvider(state.providers.get(), provider),
              14,
            )),
            span(
              { class: "composer-model-label" },
              selectedModel.map((model) => modelName(model, state.model.get())),
            ),
            icon(ChevronDown, 11),
          ),
          show(traitsAvailable, () => button(
            {
              class: ["composer-chip", { active: state.traitsOpen }],
              "data-tooltip": "Model options",
              onClick: () => {
                state.modelPickerOpen.set(false);
                state.traitsOpen.toggle()();
              },
            },
            traitsLabel,
            icon(ChevronDown, 11),
          )),
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
