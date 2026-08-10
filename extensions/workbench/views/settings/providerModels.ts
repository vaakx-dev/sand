import {
  button,
  div,
  dynamicChild,
  icon,
  input,
  option,
  select,
  span,
} from "@vaakx-dev/vrui";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Star } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import type { ProviderDescription, ProviderModel } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { settingRow } from "./shared.ts";

export function providerModels(
  controller: WorkbenchController,
  state: WorkbenchState,
  provider: ProviderDescription,
): HTMLElement {
  return div(
    { class: "provider-models" },
    settingRow(
      "New thread model",
      "Model selected when this provider becomes active.",
      dynamicChild(state.providerModels, (catalog) => {
        const models = (catalog[provider.id] ?? []).filter((model) => !model.hidden);
        const selected = state.provider.get() === provider.id
          ? state.model.get()
          : models[0]?.slug || provider.defaultModel;
        return select(
          {
            class: "settings-select",
            value: selected,
            onChange: (event) => void controller.agent.selectModel(
              provider.id,
              (event.target as HTMLSelectElement).value,
            ),
          },
          ...models.map((model) => option({ value: model.slug }, model.slug)),
        );
      }),
    ),
    div(
      { class: "provider-model-heading" },
      span({ class: "setting-title" }, "Models"),
      span(
        { class: "setting-description" },
        state.providerModels.map((catalog) => modelCount(catalog[provider.id] ?? [])),
      ),
    ),
    dynamicChild(state.providerModels, (catalog) => modelList(
      controller,
      provider.id,
      catalog[provider.id] ?? [],
    )),
    modelAdd(controller, state, provider),
  );
}

function modelList(
  controller: WorkbenchController,
  provider: string,
  models: ProviderModel[],
): HTMLElement {
  return div(
    { class: "provider-model-list" },
    ...models.map((model, index) => div(
      { class: ["provider-model-row", { hidden: model.hidden }] },
      div(
        { class: "provider-model-copy" },
        button(
          {
            class: "provider-model-slug",
            onClick: () => void controller.agent.selectModel(provider, model.slug),
          },
          model.slug,
        ),
        model.hidden ? span({ class: "model-hidden-label" }, "Hidden") : null,
      ),
      div(
        { class: "provider-model-actions" },
        modelAction(
          model.favorite ? "Remove favorite" : "Favorite model",
          Star,
          () => void controller.models.favorite(provider, model.slug),
          model.favorite,
        ),
        modelAction(
          "Move model up",
          ArrowUp,
          () => void controller.models.move(provider, model.slug, -1),
          false,
          index === 0,
        ),
        modelAction(
          "Move model down",
          ArrowDown,
          () => void controller.models.move(provider, model.slug, 1),
          false,
          index === models.length - 1,
        ),
        modelAction(
          model.hidden ? "Show model" : "Hide model",
          model.hidden ? Eye : EyeOff,
          () => void controller.models.hide(provider, model.slug),
        ),
      ),
    )),
  );
}

function modelAction(
  label: string,
  actionIcon: Parameters<typeof icon>[0],
  run: () => void,
  active = false,
  disabled = false,
): HTMLButtonElement {
  return button(
    {
      class: ["model-action", { active }],
      disabled,
      "aria-label": label,
      "data-tooltip": label,
      onClick: run,
    },
    icon(actionIcon, 13),
  );
}

function modelAdd(
  controller: WorkbenchController,
  state: WorkbenchState,
  provider: ProviderDescription,
): HTMLElement {
  const value = state.providerModelInputs.map((inputs) => inputs[provider.id] ?? "");
  return div(
    { class: "model-add-row" },
    input({
      class: "model-slug-input",
      value,
      placeholder: "Model slug",
      "aria-label": `Add a model to ${provider.name}`,
      onInput: (event) => controller.models.setInput(
        provider.id,
        (event.target as HTMLInputElement).value,
      ),
      onKeyDown: (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        void controller.models.add(provider.id);
      },
    }),
    button(
      {
        class: "secondary-button model-add-button",
        disabled: value.map((slug) => !slug.trim()),
        onClick: () => void controller.models.add(provider.id),
      },
      icon(Plus, 13),
      "Add",
    ),
  );
}

function modelCount(models: ProviderModel[]): string {
  const visible = models.filter((model) => !model.hidden).length;
  const total = models.length;
  return visible === total ? `${total} models available.` : `${visible} of ${total} models shown.`;
}
