import { button, derive, div, dynamicChild, icon, input, onRaf, span, stop } from "@vaakx-dev/vrui";
import { Search, Star } from "lucide";

import type { WorkbenchController } from "../../controller.ts";
import { findProvider, modelName } from "../../modelCatalog.ts";
import type { ProviderModel } from "../../models.ts";
import type { WorkbenchState } from "../../state.ts";
import { closeOnOutside } from "./popover.ts";
import { providerIcon } from "../shared/providerIcon.ts";

interface PickerModel {
  provider: string;
  model: ProviderModel;
}

export function modelPicker(
  controller: WorkbenchController,
  state: WorkbenchState,
): HTMLElement {
  const visibleModels = derive(() => {
    const source = state.modelSource.get();
    const query = state.modelQuery.get().trim().toLowerCase();
    const catalog = state.providerModels.get();
    const models = source === "favorites"
      ? Object.entries(catalog).flatMap(([provider, entries]) => entries
          .filter((model) => model.favorite && !model.hidden)
          .map((model) => ({ provider, model })))
      : (catalog[source] ?? [])
          .filter((model) => !model.hidden)
          .map((model) => ({ provider: source, model }));
    return models.filter(({ model }) => !query
      || model.slug.toLowerCase().includes(query)
      || model.name.toLowerCase().includes(query));
  });
  const choose = ({ provider, model }: PickerModel) => {
    void controller.agent.selectModel(provider, model.slug);
  };
  const move = (amount: number) => {
    const last = Math.max(0, visibleModels.get().length - 1);
    state.modelIndex.set(Math.min(last, Math.max(0, state.modelIndex.get() + amount)));
  };

  return div(
    {
      class: "composer-popover-layer",
      onMount: (element) => closeOnOutside(
        element,
        () => state.modelPickerOpen.set(false),
      ),
    },
    div(
      { class: "model-picker composer-popover", onClick: stop },
      div(
        { class: "model-picker-rail" },
        button(
          {
            class: ["model-rail-button favorite", {
              active: state.modelSource.map((value) => value === "favorites"),
            }],
            "aria-label": "Favorites",
            onClick: () => selectSource(state, "favorites"),
          },
          icon(Star, 18),
        ),
        div({ class: "model-rail-divider" }),
        ...state.providers.get().map((provider) => button(
          {
            class: ["model-rail-button", {
              active: state.modelSource.map((value) => value === provider.id),
            }],
            "aria-label": provider.name,
            onClick: () => selectSource(state, provider.id),
          },
          providerIcon(provider, 18),
        )),
      ),
      div(
        { class: "model-picker-main" },
        div(
          { class: "model-search" },
          icon(Search, 15),
          input({
            class: "model-search-input",
            bindValue: state.modelQuery,
            placeholder: "Search models...",
            onMount: (element) => onRaf(() => element.focus()),
            onInput: () => state.modelIndex.set(0),
            onKeyDown: (event) => {
              if (event.key === "Escape") state.modelPickerOpen.set(false);
              if (event.key === "ArrowDown") {
                event.preventDefault();
                move(1);
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
              }
              if (event.key === "Enter") {
                const selected = visibleModels.get()[state.modelIndex.get()];
                if (selected) choose(selected);
              }
              if ((event.ctrlKey || event.metaKey) && /^[1-5]$/.test(event.key)) {
                const selected = visibleModels.get()[Number(event.key) - 1];
                if (selected) choose(selected);
              }
            },
          }),
        ),
        dynamicChild(visibleModels, (models) => div(
          { class: "model-list-picker" },
          ...models.map((entry, index) => modelRow(
            controller,
            state,
            entry,
            index,
            choose,
          )),
          models.length === 0 ? div({ class: "model-picker-empty" }, "No matching models") : null,
        )),
      ),
    ),
  );
}

function modelRow(
  controller: WorkbenchController,
  state: WorkbenchState,
  entry: PickerModel,
  index: number,
  choose: (model: PickerModel) => void,
): HTMLElement {
  const { provider, model } = entry;
  const description = findProvider(state.providers.get(), provider);
  const favorite = state.providerModels.map((catalog) =>
    catalog[provider]?.find((item) => item.slug === model.slug)?.favorite ?? false
  );
  const selected = derive(() =>
    state.provider.get() === provider && state.model.get() === model.slug
  );
  return div(
    {
      class: ["model-picker-row", {
        selected,
        highlighted: state.modelIndex.map((value) => value === index),
      }],
      role: "option",
      tabIndex: 0,
      onClick: () => choose(entry),
      onMouseEnter: () => state.modelIndex.set(index),
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        choose(entry);
      },
    },
    div(
      { class: "model-picker-copy" },
      span({ class: "model-picker-name" }, modelName(model, model.slug)),
      span(
        { class: "model-picker-provider" },
        providerIcon(description, 11),
        description?.name || provider,
      ),
    ),
    index < 5 ? span({ class: "model-shortcut" }, `Ctrl+${index + 1}`) : null,
    button(
      {
        class: ["model-favorite", { active: favorite }],
        "aria-label": favorite.map((value) => value ? "Remove from favorites" : "Add to favorites"),
        onClick: (event) => {
          event.stopPropagation();
          void controller.models.favorite(provider, model.slug);
        },
      },
      icon(Star, 14),
    ),
  );
}

function selectSource(state: WorkbenchState, source: string): void {
  state.modelSource.set(source);
  state.modelIndex.set(0);
}
