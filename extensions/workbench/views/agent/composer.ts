import { button, derive, div, dynamicChild, icon, show, span, textarea } from "@vaakx-dev/vrui";
import { ChevronDown, CornerUpLeft, RotateCcw, Send, Square } from "lucide";

import type { UiControls } from "@sand/extension-api";

import type { WorkbenchController } from "../../controller.ts";
import { findModel, findProvider, modelName, optionLabel } from "../../modelCatalog.ts";
import type { WorkbenchState } from "../../state.ts";
import { providerIcon } from "../shared/providerIcon.ts";
import { modelPicker } from "./modelPicker.ts";
import { traitsPicker } from "./traitsPicker.ts";

export function composer(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
  centered = false,
): HTMLElement {
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
    ].filter(Boolean).join(" / ");
  });

  return div(
    { class: ["composer", { centered }] },
    div(
      { class: "composer-box" },
      queueStatus(state),
      textarea({
        class: "prompt-input",
        bindValue: state.threads.prompt,
        placeholder: "Ask anything, @tag files/folders, $use skills, or / for commands",
        onKeyDown: (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void controller.runs.send();
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
        runActions(controller, state, controls),
      ),
      show(state.modelPickerOpen, () => modelPicker(controller, state, controls)),
      show(state.traitsOpen, () => traitsPicker(controller, state)),
    ),
  );
}

function queueStatus(state: WorkbenchState): HTMLElement {
  return show(state.threads.queue.map((turns) => turns.length > 0), () => div(
    { class: "composer-queue" },
    span(state.threads.queue.map((turns) => `${turns.length} queued`)),
    span(
      { class: "composer-queue-prompt" },
      state.threads.queue.map((turns) => turns[0]?.prompt ?? ""),
    ),
  ));
}

function runActions(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
): HTMLElement {
  return dynamicChild(state.threads.status, (status) => {
    if (status === "running") {
      return div(
        { class: "composer-run-actions" },
        button(
          {
            class: "composer-steer",
            "data-tooltip": "Steer active run",
            disabled: state.threads.prompt.map((value) => !value.trim()),
            onClick: () => void controller.runs.steer(),
          },
          icon(CornerUpLeft, 13),
          "Steer",
        ),
        sendButton(controller, state, controls, "Queue prompt"),
        controls.iconButton({
          label: "Stop",
          variant: "round",
          className: ["send-button", "stop"],
          renderIcon: (size) => icon(Square, size),
          onClick: () => void controller.runs.cancel(),
        }),
      );
    }
    if (status === "interrupted") {
      return div(
        { class: "composer-run-actions" },
        button(
          {
            class: "composer-steer",
            "data-tooltip": "Recover interrupted run",
            onClick: () => void controller.runs.recover(),
          },
          icon(RotateCcw, 13),
          "Recover",
        ),
        sendButton(controller, state, controls),
      );
    }
    return sendButton(controller, state, controls);
  });
}

function sendButton(
  controller: WorkbenchController,
  state: WorkbenchState,
  controls: UiControls,
  label = "Send",
): HTMLElement {
  return controls.iconButton({
    label,
    variant: "round",
    className: "send-button",
    disabled: state.threads.prompt.map((value) => !value.trim()),
    renderIcon: (size) => icon(Send, size),
    onClick: () => void controller.runs.send(),
  });
}
